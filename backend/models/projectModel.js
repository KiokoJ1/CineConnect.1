const oracledb = require('oracledb');
const { getConnection } = require('../config/db');

function mapProject(row) {
  if (!row) {
    return null;
  }

  return {
    projectId: row.PROJECT_ID,
    ownerId: row.OWNER_ID,
    ownerName: row.OWNER_NAME,
    title: row.TITLE,
    description: row.DESCRIPTION,
    roleNeeded: row.ROLE_NEEDED,
    location: row.LOCATION,
    budget: row.BUDGET,
    startDate: row.START_DATE,
    endDate: row.END_DATE,
    status: row.STATUS,
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
  };
}

const baseSelect = `
  SELECT
    p.project_id,
    p.owner_id,
    u.full_name AS owner_name,
    p.title,
    p.description,
    p.role_needed,
    p.location,
    p.budget,
    p.start_date,
    p.end_date,
    p.status,
    p.created_at,
    p.updated_at
  FROM projects p
  JOIN users u ON u.user_id = p.owner_id
`;

async function createProject(ownerId, data) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        INSERT INTO projects (
          owner_id,
          title,
          description,
          role_needed,
          location,
          budget,
          start_date,
          end_date,
          status
        )
        VALUES (
          :ownerId,
          :title,
          :description,
          :roleNeeded,
          :location,
          :budget,
          TO_DATE(:startDate, 'YYYY-MM-DD'),
          TO_DATE(:endDate, 'YYYY-MM-DD'),
          :status
        )
        RETURNING project_id INTO :projectId
      `,
      {
        ownerId,
        title: data.title,
        description: data.description,
        roleNeeded: data.roleNeeded,
        location: data.location,
        budget: data.budget,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        projectId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: true },
    );

    return findById(result.outBinds.projectId[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findById(projectId) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE p.project_id = :projectId
      `,
      { projectId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return mapProject(result.rows[0]);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

const MAX_LIMIT = 100;

/**
 * Job search/filter/pagination for the open-jobs feed.
 *
 * `search` matches title, description, OR role_needed (broad match — jobs
 * have no separate "skills" field, role_needed is the closest equivalent,
 * consistent with how the frontend already treats it — see
 * APPLICATION_WORKFLOW.md's category-mapping note). `role`/`location` are
 * narrower single-field filters; `minBudget`/`maxBudget` filter the budget
 * range.
 *
 * Backward compatible by default: called with no args, this returns every
 * open project unbounded, exactly as before — the frontend currently
 * fetches the full list and paginates client-side
 * (APPLICATION_WORKFLOW.md). Passing `page`/`limit` opts into real
 * server-side pagination instead.
 */
async function findAllOpen({ search, role, location, minBudget, maxBudget, page, limit } = {}) {
  let connection;

  try {
    connection = await getConnection();
    const conditions = [`p.status = 'open'`];
    const binds = {};

    if (search) {
      conditions.push(
        '(LOWER(p.title) LIKE LOWER(:search) OR LOWER(p.description) LIKE LOWER(:search) OR LOWER(p.role_needed) LIKE LOWER(:search))',
      );
      binds.search = `%${search}%`;
    }
    if (role) {
      conditions.push('LOWER(p.role_needed) LIKE LOWER(:role)');
      binds.role = `%${role}%`;
    }
    if (location) {
      conditions.push('LOWER(p.location) LIKE LOWER(:location)');
      binds.location = `%${location}%`;
    }
    if (minBudget != null) {
      conditions.push('p.budget >= :minBudget');
      binds.minBudget = Number(minBudget);
    }
    if (maxBudget != null) {
      conditions.push('p.budget <= :maxBudget');
      binds.maxBudget = Number(maxBudget);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const fromClause = `FROM projects p JOIN users u ON u.user_id = p.owner_id ${where}`;

    if (!page && !limit) {
      // No pagination requested — old behavior, unbounded.
      const result = await connection.execute(
        `${baseSelect}${where} ORDER BY p.created_at DESC`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return { projects: result.rows.map(mapProject), total: result.rows.length, page: 1, limit: result.rows.length, totalPages: 1 };
    }

    const effectiveLimit = Math.min(Number(limit) || 20, MAX_LIMIT);
    const effectivePage = Math.max(Number(page) || 1, 1);
    const offset = (effectivePage - 1) * effectiveLimit;

    const [countResult, rowsResult] = await Promise.all([
      connection.execute(`SELECT COUNT(*) AS cnt ${fromClause}`, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(
        `${baseSelect}${where} ORDER BY p.created_at DESC OFFSET :offset ROWS FETCH NEXT :effectiveLimit ROWS ONLY`,
        { ...binds, offset, effectiveLimit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
    ]);

    const total = Number(countResult.rows[0]?.CNT ?? 0);
    return {
      projects: rowsResult.rows.map(mapProject),
      total,
      page: effectivePage,
      limit: effectiveLimit,
      totalPages: Math.max(Math.ceil(total / effectiveLimit), 1),
    };
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function findByOwner(ownerId) {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE p.owner_id = :ownerId
        ORDER BY p.created_at DESC
      `,
      { ownerId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows.map(mapProject);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function updateProject(projectId, data) {
  let connection;

  try {
    connection = await getConnection();
    await connection.execute(
      `
        UPDATE projects
        SET
          title = :title,
          description = :description,
          role_needed = :roleNeeded,
          location = :location,
          budget = :budget,
          start_date = TO_DATE(:startDate, 'YYYY-MM-DD'),
          end_date = TO_DATE(:endDate, 'YYYY-MM-DD'),
          status = :status
        WHERE project_id = :projectId
      `,
      {
        projectId,
        title: data.title,
        description: data.description,
        roleNeeded: data.roleNeeded,
        location: data.location,
        budget: data.budget,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      },
      { autoCommit: true },
    );

    return findById(projectId);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function countByStatus(status) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM projects WHERE status = :status`,
      { status },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    return Number(result.rows[0]?.CNT ?? 0);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function countByOwner(ownerId) {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM projects WHERE owner_id = :ownerId`,
      { ownerId },
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
  createProject,
  findAllOpen,
  findById,
  findByOwner,
  updateProject,
  countByStatus,
  countByOwner,
};
