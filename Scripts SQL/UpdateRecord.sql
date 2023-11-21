ALTER PROCEDURE UpdateRecord
    @TableName NVARCHAR(255),
    @Id INT,
    @Data NVARCHAR(MAX)
AS
BEGIN
    BEGIN TRY
        -- Verificar si el registro existe antes de intentar actualizarlo
        DECLARE @CheckIfExists NVARCHAR(MAX)
        SET @CheckIfExists = 'IF NOT EXISTS (SELECT 1 FROM ' + QUOTENAME(@TableName) + ' WHERE Id = @Id)
        BEGIN
            -- El registro no existe
            SELECT 
                ''error'' AS status,
                ''Registro no encontrado'' AS message;
            RETURN;
        END'

        EXEC sp_executesql @CheckIfExists, N'@Id INT', @Id;

        DECLARE @SetClause NVARCHAR(MAX) = ''; -- Lista de asignaciones

        -- Parsear el JSON y construir la lista de asignaciones
        SELECT @SetClause = @SetClause + ',' + 
                           QUOTENAME([key]) + ' = ' + 
                           CASE 
                               WHEN ISJSON([value]) = 1 THEN [value]
                               ELSE QUOTENAME([value], '''')
                           END
        FROM OPENJSON(@Data)

        -- Eliminar la coma inicial de la lista
        SET @SetClause = STUFF(@SetClause, 1, 1, '')

        -- Construir la consulta SQL y actualizar el registro
        DECLARE @Sql NVARCHAR(MAX)
        SET @Sql = 'UPDATE ' + QUOTENAME(@TableName) + ' SET ' + @SetClause + ' WHERE Id = ' + CAST(@Id AS NVARCHAR(10))
        
        EXEC sp_executesql @Sql

        -- Devolver un objeto JSON con información detallada
        SELECT 
            'success' AS status,
            'Registro actualizado exitosamente' AS message,
            @Id AS updatedId;
    END TRY
    BEGIN CATCH
        -- En caso de error, devolver un objeto JSON con información detallada del error
        SELECT 
            'error' AS status,
            'Error al actualizar registro' AS message,
            ERROR_MESSAGE() AS errorDetails;
    END CATCH
END
