const express = require('express');
const router = express.Router();

const deviceManager = require('../socket/deviceManager');

router.get("/", (req, res) => {
    deviceManager.showAllDevices()
        .then((devices) => {
            res.json(devices);
        }).catch((error) => {
            res.status(error.status).json({
                error: error.message
            });
        });
});

router.post("/", (req, res) => {
    const device = req.body.device;
    const payload_id = req.body.payload_id;

    deviceManager.triggerDevice(device, payload_id)
        .then((ok) => {
            res.json(ok);
        }).catch((error) => {
            res.status(error.status).json({error: error.message});
        });
});

module.exports = router;

