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

async function findAllOpen() {
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
        ${baseSelect}
        WHERE p.status = 'open'
        ORDER BY p.created_at DESC
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return result.rows.map(mapProject);
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
