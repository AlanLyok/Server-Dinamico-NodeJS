const express = require('express');
const mssql = require('mssql');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();
const cors = require('cors');
const dbConfig = require('./dbConfig');

app.use(cors());
app.use(express.json());

let pool;
let tablesMetadata = {}; // Almacenará información sobre las tablas y sus relaciones





async function connectToDatabase() {
  try {
    if (!pool) {
      pool = await mssql.connect(dbConfig);
      console.log('Conexión a SQL Server exitosa');
    }
    return pool;
  } catch (error) {
    console.error('Error al conectar a SQL Server:', error);
    throw error;
  }
}

// Endpoint para obtener datos de una tabla (columnas y relaciones)
app.get('/getTableData/:tableName', async (req, res) => {
  try {
    const tableName = req.params.tableName;
    const tableData = await getTableData(tableName);
    
    res.json(tableData);
  } catch (error) {
    console.error('Error al obtener datos de la tabla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function getTableData(tableName) {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .execute('GetTableData');

    const columns = result.recordsets[0].map(column => ({
      name: column.ColumnName,
      type: column.DataType,
      maxLength: column.MaxLength,
      isNullable: column.IsNullable,
      isPrimaryKey: column.IsPrimaryKey
    }));



    return {
      columns,
    };
    
  } catch (error) {
    console.error('Error al obtener datos de la tabla:', error);
    throw error;
  }
}

// Endpoint para obtener todas las tablas a renderizar
app.get('/getAllTables', async (req, res) => {
  console.log('Solicitud recibida en /getAllTables');
  try {
    const tables = await getAllTables();
    res.json(tables);
  } catch (error) {
    console.error('Error al obtener la lista de tablas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function getAllTables() {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().execute('GetAllTables');
    return result.recordset.map(row => row.TableName);
  } catch (error) {
    console.error('Error al obtener la lista de tablas:', error);
    throw error;
  }
}

function findPrimaryKeyName(columnsInfo) {
  const primaryKeyColumn = columnsInfo.find(column => column.isPrimaryKey);

  return primaryKeyColumn ? primaryKeyColumn.name : null;
}

async function buildCrudEndpoints(tableName, columnsInfo, primaryKeyColumn) {
  try {
    if (!primaryKeyColumn) {
      console.warn(`No se puede crear endpoint CRUD para la tabla "${tableName}" ya que no se encontró la clave primaria.`);
      return;
    }

    // Almacenar la información en el objeto tablesMetadata
    tablesMetadata[tableName] = {
      columns: columnsInfo,
      primary: primaryKeyColumn,
    };


  // Build READ endpoint
  app.get(`/${tableName}/:id?`, async (req, res) => {
    try {
      const pool = await connectToDatabase();
      const recordId = req.params.id;
      
      const result = await pool.request()
        .input('TableName', mssql.NVarChar, tableName)
        .input('NombreCampoID', mssql.NVarChar, tablesMetadata[tableName].primary) // Nuevo parámetro
        .input('Id', mssql.Int, recordId)
        .execute('GetRecords');

      res.json(result.recordset);
    } catch (error) {
      console.error(`Error al obtener registros de ${tableName}:`, error);
      res.status(500).json({ error: `Error al obtener registros de ${tableName}` });
    }
  });


// Build CREATE endpoint
app.post(`/${tableName}`, async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const data = req.body;

    // Convertir el objeto de datos a una cadena JSON
    const jsonData = JSON.stringify(data);

    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .input('Data', mssql.NVarChar, jsonData)
      .execute('CreateRecord');

    res.json({ message: result.recordset[0].message, newId: result.recordset[0].newId });
  } catch (error) {
    console.error(`Error al crear registro en ${tableName}:`, error);
    res.status(500).json({ error: `Error al crear registro en ${tableName}` });
  }
});


    // Build UPDATE endpoint
    app.put(`/${tableName}/:id`, async (req, res) => {
      try {
        const pool = await connectToDatabase();
        const recordId = req.params.id;
        const data = req.body;

        // Validar que los datos enviados coincidan con las columnas de la tabla
        const validColumns = Object.keys(data).every(column => columnsInfo.some(info => info.ColumnName === column));

        if (!validColumns) {
          return res.status(400).json({ error: 'Los datos enviados no coinciden con las columnas de la tabla' });
        }

        const result = await pool.request()
          .input('TableName', mssql.NVarChar, tableName)
          .input('Id', mssql.Int, recordId)
          .input('Data', mssql.NVarChar, JSON.stringify(data))
          .execute('UpdateRecord');

        if (result.recordset[0].status === 'success') {
          res.status(200).json({
            message: result.recordset[0].message,
            updatedId: result.recordset[0].updatedId
          });
        } else {
          res.status(404).json({
            error: result.recordset[0].message
          });
        }
      } catch (error) {
        console.error(`Error al actualizar registro en ${tableName}:`, error);
        res.status(500).json({ error: `Error al actualizar registro en ${tableName}` });
      }
    });

    // Build DELETE endpoint
    app.delete(`/${tableName}/:id`, async (req, res) => {
      try {
        const pool = await connectToDatabase();
        const recordId = req.params.id;
        const result = await pool.request()
          .input('TableName', mssql.NVarChar, tableName)
          .input('Id', mssql.Int, recordId)
          .execute('DeleteRecord');

        res.json({ message: result.recordset[0].message });
      } catch (error) {
        console.error(`Error al eliminar registro en ${tableName}:`, error);
        res.status(500).json({ error: `Error al eliminar registro en ${tableName}` });
      }
    });

    console.log(`Endpoints CRUD para la tabla "${tableName}" creados`);
  } catch (error) {
    console.error('Error al construir endpoints CRUD:', error);
  }
}

// Crear endpoints dinámicamente para cada stored procedure
async function createProcedureEndpoints(procedureName) {
  app.post(`/${procedureName}`, (req, res) => executeStoredProcedure(req, res, procedureName));
}

async function executeStoredProcedure(req, res, procedureName) {
  try {
    console.log(`Ejecutando stored procedure: ${procedureName}`);
    
    const pool = await connectToDatabase();
    const parameters = req.body || {};

    // Obtener los parámetros del stored procedure
    const procedureParameters = await getStoredProcedureParameters(procedureName);

    console.log(`Parámetros del stored procedure ${procedureName}:`, procedureParameters);

    // Verificar si los campos enviados coinciden con los parámetros del stored procedure
    const validParameters = compareParameters(parameters, procedureParameters);

    console.log(parameters);
    console.log(procedureParameters);

    if (!validParameters) {
      console.error(`Error: Los campos enviados no coinciden con los parámetros del stored procedure ${procedureName}`);
      return res.status(400).json({ error: 'Los campos enviados no coinciden con los parámetros del stored procedure' });
    }

    // Crear la consulta SQL parametrizada para ejecutar el stored procedure
    let sql = `EXEC ${procedureName}`;

    // Verificar si hay parámetros y agregarlos a la consulta SQL
    if (Object.keys(parameters).length > 0) {
      sql += ` ${Object.keys(parameters).map(param => `@${param}`).join(', ')}`;
    }

    console.log(`SQL generado para ${procedureName}: ${sql}`);

    // Crear un objeto de parámetros para evitar SQL injection
    const params = Object.keys(parameters).reduce((acc, param) => {
    acc[param] = {
      type: mssql.Int,  // Cambiar a mssql.Int para un parámetro entero
      value: parameters[param],
    };
    return acc;
    }, {});

    // Crear una solicitud de SQL
    const request = pool.request();

    // Agregar parámetros
    Object.keys(params).forEach(param => {
      request.input(param, params[param].type, params[param].value);
    });

    // Ejecutar el stored procedure
    const result = await request.execute(procedureName);

    console.log(`Stored procedure ${procedureName} ejecutado exitosamente. Resultado:`, result.recordset);

    res.json({ message: 'Stored procedure ejecutado exitosamente', result: result.recordset });
  } catch (error) {
    console.error(`Error al ejecutar stored procedure ${procedureName}:`, error);
    res.status(500).json({ error: `Error al ejecutar stored procedure ${procedureName}` });
  }
}

// Comparar los parámetros enviados con los parámetros del stored procedure
function compareParameters(sentParameters, storedProcedureParameters) {
  const sentKeys = Object.keys(sentParameters);

  // Verificar si los campos enviados coinciden con los parámetros del stored procedure
  const validParameters = storedProcedureParameters.every(param => {
    const paramName = param.ParameterName.substring(1); // Eliminar el "@" del nombre del parámetro
    const paramType = param.ParameterType.toLowerCase();
    
    // Verificar si el parámetro está presente en los campos enviados
    if (!sentKeys.includes(paramName)) {
      console.error(`Error: Falta el parámetro ${paramName} en los campos enviados.`);
      return false;
    }

    // Verificar si el tipo del parámetro coincide
    const sentType = typeof sentParameters[paramName];
    const typeMatches = (paramType === 'int' && typeof sentParameters[paramName] === 'number') ||
    (paramType === 'nvarchar' && typeof sentParameters[paramName] === 'string');


    if (!typeMatches) {
      console.error(`Error: Tipo de dato incorrecto para el parámetro ${paramName}. Se esperaba ${paramType}, pero se recibió ${sentType}.`);
    }

    console.log(`Valor del parámetro ${paramName}: ${sentParameters[paramName]}`);

    return typeMatches;
  });

  return validParameters;
}


// Obtener los parámetros del stored procedure
async function getStoredProcedureParameters(procedureName) {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('ProcedureName', mssql.NVarChar, procedureName)
      .execute('GetStoredProcedureParameters');

    return result.recordset;
  } catch (error) {
    console.error(`Error al obtener los parámetros del stored procedure ${procedureName}:`, error);
    throw error;
  }
}

async function startServer() {
  try {
    // Llama a buildCrudEndpoints para cada tabla con su respectiva información de columnas
    const allTables = await getAllTables();
    for (const table of allTables) {
      const tableData = await getTableData(table);
      const columnsInfo = tableData.columns;
      const primaryKeyColumn = findPrimaryKeyName(columnsInfo); // Implementa esta función
      buildCrudEndpoints(table, columnsInfo, primaryKeyColumn);
    }
    // Llama a createProcedureEndpoints para cada stored procedure
    const allStoredProcedures = ["StoreDePrueba", "StoreDePrueba_Param", 'Sp_Ventas_Config', 'TipoAsientos_Buscar'/* ... */];
    for (const procedureName of allStoredProcedures) {
      createProcedureEndpoints(procedureName);
    }

    await connectToDatabase();

    app.listen(port, () => console.log(`Servidor en ejecución en http://localhost:${port}`));
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
  }
}

startServer();
