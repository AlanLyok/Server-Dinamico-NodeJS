Server-Dinamico-NodeJS V1

INSTALACION

npm install express
npm install cors
npm install mssql
npm install dotenv

En la base deseada se debe crear la tabla "Tables" la cual tendra los nombres de las tablas que se quiere inicializar el CRUD. 

ARCHIVO .ENV
En entorno de testing, se debe crear un archivo .env con los datos de la conexion a la base. 

DB_USER=
DB_PASSWORD=
DB_SERVER=
DB_DATABASE=
PORT=3000


LLAMADA A LOS ENDPOINTS:

    Obtener todos los artículos (GET):
        Método: GET
        URL: http://localhost:3000/{NombreTabla}

    Obtener un artículo por ID (GET):
    Método: GET
    URL: http://localhost:3000/{NombreTabla}/{ID}
        Sustituye {ID} con el ID real que deseas obtener.

    Crear un nuevo artículo (POST):
        Método: POST
        URL: http://localhost:3000/{NombreTabla}

    Enviar un JSON con todos los campos menos ID. 
    {"NombreCampo"}:{"Dato"} entre comillas ambos campos.
    
    Ejemplo:
        {
        "RazonSocial": "Descricion",
        "CUIT": "20-3566513-9",
        "Activo": "true"
        }

    Actualizar un artículo por ID (PUT):
        Método: PUT
        URL: http://localhost:3000/{NombreTabla}/{ID}

    Enviar un JSON con todos los campos menos ID.
    {"NombreCampo"}:{"Dato"} entre comillas ambos campos.

    Ejemplo:
        {
        "RazonSocial": "Descripcion actualizada",
        "CUIT": "20-3566513-9",
        "Activo": "false"
        }

    Eliminar un artículo por ID (DELETE):
        Método: DELETE
        URL: http://localhost:3000/{NombreTabla}/{ID}


