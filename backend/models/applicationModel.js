const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapApplication(row) {
  if (!row) {
    return null;
  }

  return {
    applicationId: row.APPLICATION_ID,
    projectId: row.PROJECT_ID,
    projectTitle: row.PROJECT_TITLE,
    projectOwnerId: row.PROJECT_OWNER_ID,
    freelancerId: row.FREELANCER_ID,
    freelancerName: row.FREELANCER_NAME,
    freelancerEmail: row.FREELANCER_EMAIL,
    freelancerSkills: row.FREELANCER_SKILLS,
    freelancerRating: row.FREELANCER_RATING,
    pitchText: row.PITCH_TEXT,
    status: row.STATUS,
    appliedAt: row.APPLIED_AT,
    updatedAt: row.UPDATED_AT,
  };
}

const baseSelect = `
  SELECT
    a.application_id,
    a.project_id,
    p.title AS project_title,
    p.owner_id AS project_owner_id,
    a.freelancer_id,
    u.full_name AS freelancer_name,
    u.email AS freelancer_email,
    pr.skills AS freelancer_skills,
    (SELECT ROUND(AVG(r.score), 1) FROM ratings r WHERE r.reviewee_id = a.freelancer_id) AS freelancer_rating,
    a.pitch_text,
    a.status,
    a.applied_at,
    a.updated_at
  FROM applications a
  JOIN projects p ON p.project_id = a.project_id
  JOIN users u ON u.user_id = a.freelancer_id
  LEFT JOIN profiles pr ON pr.user_id = a.freelancer_id
`;

async function createApplication(projectId, freelancerId, pitchText) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        INSERT INTO applications (project_id, freelancer_id, pitch_text)
        VALUES (:projectId, :freelancerId, :pitchText)
        RETURNING application_id INTO :applicationId
      `,
      {
        projectId,
        freelancerId,
        pitchText,
        applicationId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );

    return findById(result.outBinds.applicationId[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findById(applicationId) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE a.application_id = :applicationId
      `,
      { applicationId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return mapApplication(result.rows[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findByProjectAndFreelancer(projectId, freelancerId) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE a.project_id = :projectId
        AND a.freelancer_id = :freelancerId
      `,
      { projectId, freelancerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return mapApplication(result.rows[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findByFreelancer(freelancerId) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE a.freelancer_id = :freelancerId
        ORDER BY a.applied_at DESC
      `,
      { freelancerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows.map(mapApplication);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findByProject(projectId) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE a.project_id = :projectId
        ORDER BY a.applied_at DESC
      `,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows.map(mapApplication);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function updateStatus(applicationId, status) {
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      `
        UPDATE applications
        SET status = :status
        WHERE application_id = :applicationId
      `,
      { applicationId, status },
      { autoCommit: true },
    );

    return findById(applicationId);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function countAll() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM applications`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/** Returns { total, shortlisted } for one project — powers ProducerJobCard's counts. */
async function countByProject(projectId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted
        FROM applications
        WHERE project_id = :projectId
      `,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = result.rows[0];
    return {
      total: Number(row?.TOTAL ?? 0),
      shortlisted: Number(row?.SHORTLISTED ?? 0),
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/** Total applications by a freelancer, optionally filtered to one status (e.g. 'hired' for "completed jobs"). */
async function countByFreelancer(freelancerId, status) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        SELECT COUNT(*) AS cnt FROM applications
        WHERE freelancer_id = :freelancerId
        ${status ? 'AND status = :status' : ''}
      `,
      status ? { freelancerId, status } : { freelancerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = {
  createApplication,
  findByFreelancer,
  findById,
  findByProject,
  findByProjectAndFreelancer,
  updateStatus,
  countAll,
  countByProject,
  countByFreelancer,
};
