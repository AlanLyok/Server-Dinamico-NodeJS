--exec CreateRecord @TableName=N'Articles',@Data=N'{"Descripcion":"PRUEBA TEST 24","Activo":"true"}'

ALTER PROCEDURE CreateRecord
    @TableName NVARCHAR(255),
    @Data NVARCHAR(MAX)
AS
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Columns NVARCHAR(MAX);
        DECLARE @Values NVARCHAR(MAX);

        SELECT 
            @Columns = STRING_AGG(QUOTENAME([key]), ','),
            @Values = STRING_AGG(
                CASE 
                    WHEN ISJSON([value]) = 1 THEN [value]
                    ELSE QUOTENAME([value], '''')
                END,
                ','
            )
        FROM OPENJSON(@Data);

        -- Crear tabla temporal para almacenar el nuevo ID
        CREATE TABLE #TempNewId (NewId INT);

        DECLARE @Sql NVARCHAR(MAX);
        SET @Sql = 
            'INSERT INTO ' + QUOTENAME(@TableName) + ' (' + @Columns + ') ' +
            'OUTPUT INSERTED.id INTO #TempNewId ' +
            'VALUES (' + @Values + ');';

        EXEC sp_executesql @Sql;

        DECLARE @NewId INT;
        SELECT @NewId = NewId FROM #TempNewId;

        -- Eliminar la tabla temporal
        DROP TABLE #TempNewId;

        COMMIT;

        SELECT 
            'success' AS status,
            'Registro creado exitosamente' AS message,
            @NewId AS newId;
    END TRY
    BEGIN CATCH
        ROLLBACK;

        SELECT 
            'error' AS status,
            'Error al crear registro' AS message,
            ERROR_MESSAGE() AS errorDetails;
    END CATCH
END
