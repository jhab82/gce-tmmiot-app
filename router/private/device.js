//device.js

const express = require('express');
const oauth2 = require('../../lib/oauth2');

const router = express.Router();

function getModelDevice() {
  return require(`../../model/datastore-device`);
}

// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
router.use(oauth2.template);

// Set Content-Type for all responses for these routes
router.use((req, res, next) => {
  res.set('Content-Type', 'text/html');
  next();
});

router.get('/', oauth2.required, (req, res, next) => {
      userId = req.user.id;
      getModelDevice().listRegisteredDevices(
      userId,
      10,
      req.query.pageToken, 
      (err, devices, cursor) => {
    if (err) {
        res.redirect("/");
        } else {
            res.render('private/devices.pug', {
                devices: devices,
                nextPageToken: cursor,
            });
        }
    });
});

router.get('/list/:deviceId', oauth2.required, (req, res, next) => {
  //check the deviceId requested is registered to the owner
  getModelDevice().isDeviceIdRegistered(req.params.deviceId, (err, device) => {
        if (err) { console.log("err: " + err) }
        else if (device[0].userId == req.user.id) {
                  
        getModelDevice().listDataByDeviceId(
            req.params.deviceId, 
            10,
            req.query.pageToken, 
            (err, measurements, cursor) => {
            if (err) {
                    res.redirect("/device");
                } else {
                    
                    res.render('private/measurementList.pug', {
                        deviceId: device[0].deviceId,
                        measurements: measurements,
                        nextPageToken: cursor,
                    });
                }
            });
        } else {
            res.redirect(`${req.baseUrl}/`);
        }
    });
});

router.get('/chart/:deviceId', oauth2.required, (req, res, next) => {
     
  getModelDevice().isDeviceIdRegistered(req.params.deviceId, (err, device) => {
        if (err) { console.log("err: " + err) }
        else if (device[0].userId == req.user.id) {
                  
        getModelDevice().listDataByDeviceId(
            req.params.deviceId, 
            500,
            req.query.pageToken, 
            (err, measurements, cursor) => {
            if (err) {
                res.redirect("/device");
                } else {
                    
                    res.render('private/measurementChart.pug', {
                        deviceId: device[0].deviceId,
                        measurements: JSON.stringify(measurements),
                        nextPageToken: cursor,
                    });
                }
            });
        } else {
            res.redirect(`${req.baseUrl}/`);
        }
    });
});

router.get('/register', oauth2.required, (req, res) => {
    res.render('private/registerForm.pug', {
        device : {"deviceId": ""},
        action: 'Add',
    });
});

router.post('/register', oauth2.required, (req, res) => {
    const data = req.body;
    getModelDevice().isDeviceIdRegistered(data.deviceId, (err, deviceId) => {
        if (err) { console.log("err: " + err) }
        else if (deviceId.length != 0 && deviceId[0].userId == "0") {
            data.userId = req.user.id;
            getModelDevice().registerDeviceForUser(deviceId[0].id, data, false,  (err, registeredDevice) => {
                if (err) {
                    next(err);
                    return;
                }
                    res.redirect(`${req.baseUrl}/chart/${registeredDevice.deviceId}`);
                });
        } else {
            res.redirect(`${req.baseUrl}/register`);
        }
    });
});

//this is the route for the 7 day delete cron job

router.get('/deleteAllOldData123456789', (req, res, next) => {
      getModelDevice().deleteAllOldData(null, (err, response) => {
          if (err) { console.log("err: " + err)}
          else {
              console.log("Old data deleted");
              res.status(200).send('Done');
          }
      });
});



/**
 * Errors on "/device/*" routes.
 */
router.use((err, req, res,  next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

module.exports = router;