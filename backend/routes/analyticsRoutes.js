const express          = require('express');
const oracledb         = require('oracledb');
const { authenticate } = require('../middleware/authMiddleware');
const { getConnection }= require('../config/db');
const { sendSuccess }  = require('../utils/apiResponse');

const router = express.Router();

// GET /api/analytics/me
router.get('/me', authenticate, async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const userId = req.user.id;
    const role   = req.user.role;

    if (role === 'freelancer') {
      const [appStats, statusBreakdown, recentActivity, ratingStats] = await Promise.all([
        connection.execute(
          `SELECT TO_CHAR(applied_at, 'Mon') AS month,
                  EXTRACT(MONTH FROM applied_at) AS month_num,
                  COUNT(*) AS total
           FROM applications
           WHERE freelancer_id = :userId
             AND applied_at >= ADD_MONTHS(SYSDATE, -6)
           GROUP BY TO_CHAR(applied_at, 'Mon'), EXTRACT(MONTH FROM applied_at)
           ORDER BY month_num`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        connection.execute(
          `SELECT status, COUNT(*) AS cnt
           FROM applications WHERE freelancer_id = :userId
           GROUP BY status`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        connection.execute(
          `SELECT a.status, p.title AS project_title, a.applied_at
           FROM applications a JOIN projects p ON p.project_id = a.project_id
           WHERE a.freelancer_id = :userId
           ORDER BY a.applied_at DESC
           FETCH FIRST 5 ROWS ONLY`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        connection.execute(
          `SELECT ROUND(AVG(score),1) AS avg_score, COUNT(*) AS total_ratings
           FROM ratings WHERE reviewee_id = :userId`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
      ]);

      // Build status map from query results — plain JS, no TypeScript annotations
      const statusMap = {};
      statusBreakdown.rows.forEach(r => { statusMap[r.STATUS] = Number(r.CNT); });
      const totalApps = Object.values(statusMap).reduce((a, b) => a + b, 0);

      return sendSuccess(res, 200, 'Analytics retrieved.', {
        role: 'freelancer',
        summary: {
          totalApplications: totalApps,
          hired:        statusMap['hired']       || 0,
          shortlisted:  statusMap['shortlisted'] || 0,
          declined:     statusMap['declined']    || 0,
          pending:      statusMap['applied']     || 0,
          avgRating:    ratingStats.rows[0] ? ratingStats.rows[0].AVG_SCORE   : null,
          totalRatings: ratingStats.rows[0] ? ratingStats.rows[0].TOTAL_RATINGS : 0,
        },
        applicationsByMonth: appStats.rows.map(r => ({
          month: r.MONTH,
          total: Number(r.TOTAL),
        })),
        statusBreakdown: statusMap,
        recentActivity: recentActivity.rows.map(r => ({
          projectTitle: r.PROJECT_TITLE,
          status:       r.STATUS,
          appliedAt:    r.APPLIED_AT,
        })),
      });

    } else {
      const [projectStats, appsByProject, recentProjects, topRoles] = await Promise.all([
        connection.execute(
          `SELECT COUNT(*) AS total_projects,
                  SUM(CASE WHEN status='open'   THEN 1 ELSE 0 END) AS open_projects,
                  SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) AS closed_projects
           FROM projects WHERE owner_id = :userId`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        connection.execute(
          `SELECT p.title, COUNT(a.application_id) AS applicant_count,
                  SUM(CASE WHEN a.status='hired' THEN 1 ELSE 0 END) AS hired_count
           FROM projects p
           LEFT JOIN applications a ON a.project_id = p.project_id
           WHERE p.owner_id = :userId
           GROUP BY p.project_id, p.title
           ORDER BY applicant_count DESC
           FETCH FIRST 5 ROWS ONLY`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        connection.execute(
          `SELECT TO_CHAR(created_at,'Mon') AS month,
                  EXTRACT(MONTH FROM created_at) AS month_num,
                  COUNT(*) AS total
           FROM projects WHERE owner_id = :userId
             AND created_at >= ADD_MONTHS(SYSDATE, -6)
           GROUP BY TO_CHAR(created_at,'Mon'), EXTRACT(MONTH FROM created_at)
           ORDER BY month_num`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        connection.execute(
          `SELECT role_needed, COUNT(*) AS cnt
           FROM projects WHERE owner_id = :userId
           GROUP BY role_needed ORDER BY cnt DESC FETCH FIRST 5 ROWS ONLY`,
          { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
      ]);

      const ps             = projectStats.rows[0] || {};
      const totalApplicants= appsByProject.rows.reduce((s, r) => s + Number(r.APPLICANT_COUNT), 0);
      const totalHired     = appsByProject.rows.reduce((s, r) => s + Number(r.HIRED_COUNT), 0);

      return sendSuccess(res, 200, 'Analytics retrieved.', {
        role: 'producer',
        summary: {
          totalProjects:  Number(ps.TOTAL_PROJECTS)  || 0,
          openProjects:   Number(ps.OPEN_PROJECTS)   || 0,
          closedProjects: Number(ps.CLOSED_PROJECTS) || 0,
          totalApplicants,
          totalHired,
          hireRate: totalApplicants > 0
            ? Math.round((totalHired / totalApplicants) * 100) : 0,
        },
        projectsByMonth: recentProjects.rows.map(r => ({
          month: r.MONTH,
          total: Number(r.TOTAL),
        })),
        topProjects: appsByProject.rows.map(r => ({
          title:          r.TITLE,
          applicantCount: Number(r.APPLICANT_COUNT),
          hiredCount:     Number(r.HIRED_COUNT),
        })),
        topRoles: topRoles.rows.map(r => ({
          role:  r.ROLE_NEEDED,
          count: Number(r.CNT),
        })),
      });
    }

  } catch (err) {
    return next(err);
  } finally {
    if (connection) await connection.close();
  }
});

module.exports = router;
