require('dotenv').config();

const pool = require('../src/config/db');
const { OLIVE_YOUNG_PRODUCT_REFERENCES } = require('../src/constants/oliveYoungProductReference');

function mergeDuplicateProducts(products) {
    const productMap = new Map();

    products.forEach((product) => {
        const key = `${product.sourceIngredient}::${product.brandName}::${product.productName}`;

        if (!productMap.has(key)) {
            productMap.set(key, {
                ...product,
                sourceIngredients: [product.sourceIngredient],
                ingredients: [...product.ingredients],
            });
            return;
        }

        const mergedProduct = productMap.get(key);
        mergedProduct.sourceIngredients.push(product.sourceIngredient);
        mergedProduct.ingredients = [...new Set([
            ...mergedProduct.ingredients,
            ...product.ingredients,
        ])];
        mergedProduct.productUrl = product.productUrl;
    });

    return [...productMap.values()];
}

async function findIngredientIds(connection, ingredientNames) {
    const [rows] = await connection.query(
        `
            SELECT ingredient_id, ingredient_name
            FROM t_ingredient
            WHERE ingredient_name IN (?)
        `,
        [ingredientNames],
    );

    return new Map(rows.map((row) => [row.ingredient_name, row.ingredient_id]));
}

async function upsertProduct(connection, product) {
    const [rows] = await connection.query(
        `
            SELECT product_id
            FROM t_product
            WHERE brand_name = ?
                AND product_name = ?
                AND product_url = ?
            LIMIT 1
        `,
        [product.brandName, product.productName, product.productUrl],
    );

    if (rows[0]) {
        await connection.query(
            `
                UPDATE t_product
                SET
                    product_type = ?,
                    price_amount = ?,
                    product_url = ?,
                    description = ?,
                    product_img = ?,
                    is_active = 1,
                    updated_at = NOW()
                WHERE product_id = ?
            `,
            [
                product.productType,
                product.priceAmount,
                product.productUrl,
                product.description,
                product.productImg,
                rows[0].product_id,
            ],
        );

        return rows[0].product_id;
    }

    const [result] = await connection.query(
        `
            INSERT INTO t_product (
                brand_name,
                product_name,
                product_type,
                price_amount,
                product_url,
                description,
                product_img,
                is_active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `,
        [
            product.brandName,
            product.productName,
            product.productType,
            product.priceAmount,
            product.productUrl,
            product.description,
            product.productImg,
        ],
    );

    return result.insertId;
}

async function deactivateLegacyGlobalProducts(connection) {
    await connection.query(
        `
            UPDATE t_product
            SET
                is_active = 0,
                updated_at = NOW()
            WHERE product_url LIKE 'https://global.oliveyoung.com/search?query=%'
        `,
    );
}

async function deactivateCurrentOliveYoungProducts(connection) {
    await connection.query(
        `
            UPDATE t_product
            SET
                is_active = 0,
                updated_at = NOW()
            WHERE product_url LIKE 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=%'
        `,
    );
}

async function replaceProductIngredients(connection, productId, ingredientIdsByName, product) {
    await connection.query(
        'DELETE FROM t_product_ingredient WHERE product_id = ?',
        [productId],
    );

    for (const [index, ingredientName] of product.ingredients.entries()) {
        const ingredientId = ingredientIdsByName.get(ingredientName);

        if (!ingredientId) {
            throw new Error(`Ingredient not found: ${ingredientName}`);
        }

        await connection.query(
            `
                INSERT INTO t_product_ingredient (
                    product_id,
                    ingredient_id,
                    ingredient_pct
                )
                VALUES (?, ?, ?)
            `,
            [productId, ingredientId, index === 0 ? 100 : 10],
        );
    }
}

async function seed({ dryRun = false } = {}) {
    const products = mergeDuplicateProducts(OLIVE_YOUNG_PRODUCT_REFERENCES);

    if (dryRun) {
        console.log(`Prepared ${products.length} Olive Young product candidates.`);
        console.table(products.map((product) => ({
            sourceIngredients: product.sourceIngredients.join(', '),
            brandName: product.brandName,
            productName: product.productName,
            productType: product.productType,
            ingredients: product.ingredients.join(', '),
        })));
        return;
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await deactivateLegacyGlobalProducts(connection);
        await deactivateCurrentOliveYoungProducts(connection);

        const ingredientNames = [...new Set(products.flatMap((product) => product.ingredients))];
        const ingredientIdsByName = await findIngredientIds(connection, ingredientNames);

        for (const product of products) {
            const productId = await upsertProduct(connection, product);
            await replaceProductIngredients(connection, productId, ingredientIdsByName, product);
        }

        await connection.commit();
        console.log(`Seeded ${products.length} Olive Young product candidates.`);
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
        console.error('Failed to seed Olive Young product data:', error);
        process.exit(1);
    });
}

module.exports = {
    seed,
};
