const mysql = require('mysql');
const config = require('../config/config');
const crypto = require('crypto');

const algorithm = 'aes256'; // Encryption algorithm
const key = 'password'; // Encryption key

const pool = mysql.createPool(config.mysql);


// syncContacts functions is used to synchronize contacts for a given user


async function syncContacts(userId, contacts) {
    const connection = await getConnectionFromPool();
    await beginTransaction(connection);


    //   here i used try catch block for error handling with database conectivity

    try {
        for (const contact of contacts) {
            const encryptedNumber = encryptNumber(contact.number);
            const contactIdResult = await executeQuery(connection, 'INSERT INTO contacts (name, encrypted_number) VALUES (?, ?) ON DUPLICATE KEY UPDATE encrypted_number = VALUES(encrypted_number)', [contact.name, encryptedNumber]);
            await executeQuery(connection, 'INSERT INTO user_contacts (user_id, contact_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = user_id', [userId, contactIdResult.insertId]);
        }

        await commitTransaction(connection);
    } catch (error) {
        await rollbackTransaction(connection);
        throw error;
    } finally {
        releaseConnection(connection);
    }
}



//  findCommonUser function used  to find users who have a common contact


async function findCommonUser(searchNumber) {
    const connection = await getConnectionFromPool();
    const encryptedNumber = encryptNumber(searchNumber);
    const result = await executeQuery(connection, 'SELECT uc.user_id, c.name FROM user_contacts uc INNER JOIN contacts c ON uc.contact_id = c.id WHERE c.encrypted_number = ?', [encryptedNumber]);
    releaseConnection(connection);
    return result.map(row => row.user_id);
}


// getContacts funnction is used     to get contacts for a given user

async function getContacts(userId, page = 1, pageSize = 10, searchText) {
    const connection = await getConnectionFromPool();
    let queryParams = [userId];
    let queryText = 'SELECT c.name, c.encrypted_number FROM user_contacts uc INNER JOIN contacts c ON uc.contact_id = c.id WHERE uc.user_id = ?';

    if (searchText) {
        queryText += ' AND c.name LIKE ?';
        queryParams.push(`%${searchText}%`);
    }

    const totalCountQueryResult = await executeQuery(connection, 'SELECT COUNT(*) as total FROM user_contacts WHERE user_id = ?', [userId]);
    const totalCount = totalCountQueryResult[0].total;

    const offset = (page - 1) * pageSize;
    const result = await executeQuery(connection, queryText + ' LIMIT ? OFFSET ?', [...queryParams, parseInt(pageSize), parseInt(offset)]);
    releaseConnection(connection);

    // Decrypt the encrypted contact numbers before returning
    const decryptedResult = result.map(row => ({ name: row.name, number: decryptNumber(row.encrypted_number) }));
    return { totalCount, rows: decryptedResult };
}

// getConnectionFromPool functions is used  to acquire a connection from the pool

function getConnectionFromPool() {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                return reject(err);
            }
            resolve(connection);
        });
    });
}

//  executeQuery function is used to execute SQL queries


function executeQuery(connection, query, values) {

    return new Promise((resolve, reject) => {
        connection.query(query, values, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
}

// these functions is used to database transaction like begin,commit, rollback and relese the transations


function beginTransaction(connection) {
    return executeQuery(connection, 'START TRANSACTION');
}

function commitTransaction(connection) {
    return executeQuery(connection, 'COMMIT');
}

function rollbackTransaction(connection) {
    return executeQuery(connection, 'ROLLBACK');
}

function releaseConnection(connection) {
    connection.release();
}

// Function to encrypt the contact number
function encryptNumber(number) {
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(number, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Function to decrypt the encrypted contact number
function decryptNumber(encrypted) {
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}



// besicall  exports functions is used to use in other modules


module.exports = { syncContacts, findCommonUser, getContacts };
