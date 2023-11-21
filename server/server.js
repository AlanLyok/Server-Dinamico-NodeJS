// server/server.js
const express = require('express');
const mssql = require('mssql');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();
const cors = require('cors');
const dbConfig = require('./dbConfig');
const bodyParser = require('body-parser');


app.use(cors());

let pool;

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

// Endpoint para obtener columnas de una tabla
app.get('/getTableColumns/:tableName', async (req, res) => {
  try {
    const tableName = req.params.tableName;
    const columns = await getTableColumns(tableName);
    res.json(columns);
  } catch (error) {
    console.error('Error al obtener columnas de la tabla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


async function getTableColumns(tableName) {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .execute('GetTableColumns');

    return result.recordset;
  } catch (error) {
    console.error('Error al obtener columnas de la tabla:', error);
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



async function buildCrudEndpoints(tableName) {
  try {
    const columns = await getTableColumns(tableName);



// Build READ endpoint
app.get(`/${tableName}/:id?`, async (req, res) => {
  try {
    const pool = await connectToDatabase();

    // Obtener el ID de los parámetros de la solicitud
    const recordId = req.params.id;

    // Llamar al stored procedure GetRecords con el ID opcional
    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .input('Id', mssql.Int, recordId)
      .execute('GetRecords');

    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  }
});


// Build CREATE endpoint
app.post(`/${tableName}`, async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .input('Data', mssql.NVarChar, JSON.stringify(req.body))
      .execute('CreateRecord');

    res.json({ message: result.recordset[0].message, newId: result.recordset[0].newId });
  } catch (error) {
    console.error('Error al crear registro:', error);
    res.status(500).json({ error: 'Error al crear registro' });
  }
});





// Build UPDATE endpoint
app.put(`/${tableName}/:id`, async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .input('Id', mssql.Int, req.params.id)
      .input('Data', mssql.NVarChar, JSON.stringify(req.body))
      .execute('UpdateRecord');

    // Verificar el status y enviar la respuesta correspondiente
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
    console.error('Error al actualizar registro:', error);
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
});



// Build DELETE endpoint
app.delete(`/${tableName}/:id`, async (req, res) => {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('TableName', mssql.NVarChar, tableName)
      .input('Id', mssql.Int, req.params.id)
      .execute('DeleteRecord');

    res.json({ message: result.recordset[0].message });
  } catch (error) {
    console.error('Error al eliminar registro:', error);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});


    console.log(`Endpoints CRUD para la tabla "${tableName}" creados`);
  } catch (error) {
    console.error('Error al construir endpoints CRUD:', error);
  }
}



app.use(cors());
app.use(express.json());



// Example: Build CRUD endpoints for tables
buildCrudEndpoints('Articles');
buildCrudEndpoints('Precios');
buildCrudEndpoints('Proveedores');



connectToDatabase().catch(err => console.error('Error al conectar a SQL Server', err));

app.listen(port, () => console.log(`Servidor en ejecución en http://localhost:${port}`));