
-- DELETE PROCEDURE
ALTER PROCEDURE DeleteRecord
    @TableName NVARCHAR(255),
    @Id INT
AS
BEGIN
    BEGIN TRY
        -- Verificar si el registro existe antes de intentar eliminarlo
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

        -- Construir la consulta SQL y eliminar el registro
        DECLARE @Sql NVARCHAR(MAX)
        SET @Sql = 'DELETE FROM ' + QUOTENAME(@TableName) + ' WHERE Id = ' + CAST(@Id AS NVARCHAR(10))
        
        EXEC sp_executesql @Sql

        -- Devolver un objeto JSON con información detallada
        SELECT 
            'success' AS status,
            'Registro eliminado exitosamente' AS message;
    END TRY
    BEGIN CATCH
        -- En caso de error, devolver un objeto JSON con información detallada del error
        SELECT 
            'error' AS status,
            'Error al eliminar registro' AS message,
            ERROR_MESSAGE() AS errorDetails;
    END CATCH
END
