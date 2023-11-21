ALTER PROCEDURE GetRecords
    @TableName NVARCHAR(255),
    @Id INT = NULL
AS
BEGIN
    DECLARE @Sql NVARCHAR(MAX)

    -- Si se proporciona un ID, devuelve ese registro específico; de lo contrario, devuelve todos los registros
    IF @Id IS NOT NULL
        SET @Sql = 'SELECT * FROM ' + @TableName + ' WHERE Id = ' + CAST(@Id AS NVARCHAR(10))
    ELSE
        SET @Sql = 'SELECT * FROM ' + @TableName

    EXEC sp_executesql @Sql
END
