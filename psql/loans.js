postgres = require("pg");
config = require("../config.js");

postgres.defaults.poolSize = 0;

var postgresAddr = config.postgresAddr;

exports.getDataFromDb = function(loanId, callback) {
    var results = {};
    getData('loans', loanId, function(err, loan) {
        if (err) {
            return callback(err);
        }
        results.loan = loan;
        getData('borrowers', loan.borrower_id, function(err, borrower) {
            results.borrower = borrower;
            callback(err, parseData(results));
        })
    })
}

var parseData = function(results) {
    var parsed = {}
    for(var key in results) {
        var item = results[key];
        for(var k in item) {
            var newKey = key + '_' + k;
            if(item[k] !== null) {
                parsed[newKey] = item[k].toString();    
            }
        }
    }
    return parsed;
}

var getData = function(table, id, callback) {
    if (id == null) {
        return callback('Selected loan doesn\'t exist');
    }
    postgres.connect(postgresAddr, function(err, client, done){
        //var pool = postgres.pools.getOrCreate(postgresAddr);
        if (err) {
            done();
            console.log(err);
            callback("Error while connecting to database");
        } else {
            client.query("SELECT * FROM " + table + " where " + table + ".id = $1::int", [parseInt(id)], function(err, result){
                done();
                if(err) {
                    console.log(err)
                    callback('Error while connecting to database');
                }
                else {
                    if (!result.rowCount) {
                        callback('Selected loan doesn\'t exist');
                    } else {
                        callback(null, result.rows[0]);
                    }
                }
            });
        }
    });
}
