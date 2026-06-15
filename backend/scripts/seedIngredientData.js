require('dotenv').config();

const pool = require('../src/config/db');
const { INGREDIENT_REFERENCES } = require('../src/constants/ingredientReference');

async function upsertIngredient(connection, ingredient) {
    await connection.query(
        `
            INSERT INTO t_ingredient (
                ingredient_name,
                ingredient_type,
                description
            )
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                ingredient_type = VALUES(ingredient_type),
                description = VALUES(description)
        `,
        [
            ingredient.name,
            ingredient.type,
            ingredient.description,
        ],
    );
}

async function seed({ dryRun = false } = {}) {
    if (dryRun) {
        console.log(`Prepared ${INGREDIENT_REFERENCES.length} cosmetic ingredients.`);
        console.table(INGREDIENT_REFERENCES.map((ingredient) => ({
            name: ingredient.name,
            type: ingredient.type,
            description: ingredient.description,
        })));
        return;
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const ingredient of INGREDIENT_REFERENCES) {
            await upsertIngredient(connection, ingredient);
        }

        await connection.commit();
        console.log(`Seeded ${INGREDIENT_REFERENCES.length} cosmetic ingredients.`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

if (require.main === module) {
    seed({ dryRun: process.argv.includes('--dry-run') }).catch((error) => {
        console.error('Failed to seed ingredient data:', error);
        process.exit(1);
    });
}

module.exports = {
    seed,
};
