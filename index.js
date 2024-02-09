const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();


app.use(express.json())

const db = new sqlite3.Database('./database.db',sqlite3.OPEN_READWRITE,(err)=>{
    if(err)  return console.log(err.message);
    console.log("Connected to the database");
  });

  db.run(`DROP TABLE IF EXISTS users;`,err=>{
    if(err) console.log(err)
    db.run(`CREATE TABLE users (
        user_id INT PRIMARY KEY,
        user_name VARCHAR(255),
        balance INT
    );
    `, err=>{
        if(err) console.log("Error on creating users table in database. ", err);
        console.log("Users Table Created")
        
    })
  });

  db.run(`DROP TABLE IF EXISTS stations;`,err=>{
    if(err) console.log(err)
    db.run(`CREATE TABLE stations (
        station_id INT PRIMARY KEY,
        station_name VARCHAR(255),
        longitude DECIMAL(9,6),
        latitude DECIMAL(9,6)
    );
    `, err=>{
        if(err) console.log("Error on creating stations table in database. ", err);
        console.log("Stations Table Created")
        
    })
  });

  db.run(`DROP TABLE IF EXISTS trains;`,err=>{
    if(err) console.log(err)
    db.run(`CREATE TABLE trains (
        train_id INT PRIMARY KEY,
        train_name VARCHAR(255) NOT NULL,
        capacity INT NOT NULL
    );
    `, err=>{
        if(err) console.log("Error on creating trains table in database. ", err);
        console.log("Trains Table Created")
        
    })
  });

  db.run(`DROP TABLE IF EXISTS stops;`,err=>{
    if(err) console.log(err)
    db.run(`CREATE TABLE stops (
        station_id INT,
        train_id INT,
        arrival_time VARCHAR(255),
        departure_time VARCHAR(255),
        fare INT,
        FOREIGN KEY (station_id) REFERENCES stations(station_id)
        FOREIGN KEY (train_id) REFERENCES trains(train_id)
    );
    `, err=>{
        if(err) console.log("Error on creating stops table in database. ", err);
        console.log("stops Table Created")
        
    })
  });




//trains
app.post('/api/trains',(req,res)=>{
    // console.log("hit krse")
    const {train_id,train_name,capacity,stops} = req.body;
    db.run(`INSERT INTO trains (train_id,train_name,capacity)
    VALUES (?,?,?);`,[train_id,train_name,capacity],err=>{
        if(err) return console.log(err.message);
        stops.forEach(stop=>{
            const {station_id,arrival_time,departure_time,fare} = stop;
            db.run(`INSERT INTO stops(station_id,train_id,arrival_time,departure_time,fare)
            VALUES (?,?,?,?,?);`,[station_id,train_id,arrival_time,departure_time,fare],(err)=>{
                if(err) return console.log(err.message)
            })
        })

        res.status(201).json({
                    "train_id": train_id,
                    "train_name":train_name,
                    "capacity": capacity,
                    "service_start": stops[0].departure_time,
                    "service_ends": stops[stops.length-1].arrival_time,
                    "num_stations": stops.length
                })
        

    });
})

//stations
app.post('/api/stations',(req,res)=>{
    console.log("stations api hit")
    const {station_id,station_name,longitude,latitude} = req.body;
    db.run(`INSERT INTO stations(station_id, station_name, longitude,latitude)
    VALUES (?,?,?,?);`,[station_id,station_name,longitude,latitude],err=>{
        if(err) console.log(err.message);
        res.status(201).json({
            "station_id":station_id,
            "station_name": station_name,
            "logitude":longitude,
            "latitude": latitude
        })

    });
})

app.get('/api/stations',(req,res)=>{
    db.all(`SELECT * FROM stations ORDER BY station_id`,[],(err,rows)=>{
        if(err) console.log(err.message);
        res.status(200).json({"stations":rows})
    })
})

app.get('/api/stations/:station_id/trains',(req,res)=>{
    const stationId = req.params.station_id;
    db.get(`SELECT * FROM stations WHERE station_id=?`,[stationId],(err,row)=>{
        if(err){
            return console.log(err)
        }
        if(!row){
            res.status(404).json({
                "message":`station with id: ${stationId} was not found`
            })
        }else{
            db.all(`SELECT * FROM stops WHERE station_id =?`,[stationId],(err,rows)=>{
                if(err) return console.log(err)
                let trains =[];
                rows.forEach(row=>{
                    const {train_id,arrival_time,departure_time} = row;
                    trains.push({
                        "train_id": train_id,
                        "arrival_time": arrival_time,
                        "departure_time": departure_time
                    })
                })

                trains.sort((a,b)=>{
                    if(a.departure_time>b.departure_time){
                        return 1;
                    }else if(a.departure_time<b.departure_time){
                        return -1;
                    }else{
                        if(a.arrival_time>b.arrival_time){
                            return 1;
                        }else if(a.arrival_time<b.arrival_time){
                            return -1;
                        }else{
                            if(a.train_id>b.train_id){
                                return 1;
                            }else if(a.train_id<b.train_id){
                                return -1;
                            } return 0;
                        }
                    }
                })

                res.status(200).json({
                    "station_id":stationId,
                    "trains":trains
                })
            })
            
        }
        
    })
})


//users
app.post('/api/users',(req,res)=>{
    const {user_id,user_name,balance} = req.body;
    console.log("hit on post api/users")
    db.run(`INSERT INTO users (user_id, user_name, balance)
    VALUES (?,?,?);`,[user_id,user_name,balance],err=>{
        if(err) console.log(err.message);
        res.status(201).json({
            "user_id":user_id,
            "user_name":user_name,
            "balance":balance
        })

    });
})

app.get('/api/wallets/:wallet_id',(req,res)=>{
    const walletId = req.params.wallet_id;
    db.get(`SELECT * FROM users WHERE user_id=?`,[walletId],(err,row)=>{
        if(err) return console.log(err)
        if(row){
            res.status(200).json({
                "wallet_id": walletId,
                "balance": row.balance,
                "wallet_user": {
                    "user_id": row.user_id,
                    "user_name": row.user_name
                }
            })
        }else{
            res.status(404).json({"message": `wallet with id: ${walletId} was not found`})
        }
    })
})
app.put('/api/wallets/:wallet_id',(req,res)=>{
    const walletId = req.params.wallet_id;
    const {recharge} = req.body;
    const recharge_ammount = recharge;
    db.get(`SELECT * FROM users WHERE user_id=?`,[walletId],(err,row)=>{
        if(err) return console.log(err)
        if(row){
            let {user_id,user_name,balance} = row;
            if(recharge_ammount>=100 && recharge_ammount<=10000){
                console.log(typeof(recharge_ammount))
                balance+= recharge_ammount;
                db.run(`UPDATE users SET balance=? WHERE user_id=?`,[balance,user_id],(err)=>{
                    if(err) return console.log(err);
                    res.status(200).json({
                        "wallet_id": walletId,
                        "balance": balance,
                        "wallet_user": {
                            "user_id": row.user_id,
                            "user_name": row.user_name
                        }
                    })
                })
            }else{
                res.status(400).json({"message":`invalid amount: ${recharge_ammount}`})
            }
            
        }else{
            res.status(404).json({"message": `wallet with id: ${walletId} was not found`})
        }
    })
})


app.listen(8000, () => {
    console.log('Server running on port 8000');
});