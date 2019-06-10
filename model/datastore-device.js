// datastore-device.js

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const kind_data = 'tmmiot_datastore_2';

const kind_device = 'tmmiot_devices';

// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [kind, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore(obj) {
  obj.id = obj[Datastore.KEY].id;
  return obj;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore(obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  let results = [];
  Object.keys(obj).forEach(k => {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1,
    });
  });
  return results;
}

// list all registered tmmiot_devices
function listRegisteredDevices(userId, limit, token, cb) {
     const q = ds
    .createQuery([kind_device])
    .filter('userId', '=', userId)
    .limit(limit)
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });

}

// list the Data for the defined device
// 
function listDataByDeviceId(deviceId, limit, token, cb) {
  const q = ds
    .createQuery([kind_data])
    .filter('id', '=', deviceId)
    .order('time', {descending: true})
    .limit(limit)
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}

function isDeviceIdRegistered(deviceId, cb) {
  const q = ds
    .createQuery([kind_device])
    .filter('deviceId', '=', deviceId);

  ds.runQuery(q, (err, entity) => {
    if (err) {
      cb(err);
      return;
    }
    cb(null, entity.map(fromDatastore));
  });
}

//queuePart come from background processing feature not used at the moment.

function registerDeviceForUser(id, data, queuePart, cb) {
  let key;
  if (id) {
    key = ds.key([kind_device, parseInt(id, 10)]);
  } else {
    key = ds.key(kind_device);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['description']),
  };

  ds.save(entity, err => {
    if (err) {
      cb(err);
      return;
    }
    data.id = entity.key.id;
    if (queuePart) {
      background.queuePart(data.id);
    }
    cb(null, data);
  });
}

function _delete(id, cb) {
  const key = ds.key([kind_data, parseInt(id, 10)]);
  /** TODO: only allow deleting parts with no children */
  ds.delete(key, cb);
}

function deleteAllOldData(option, cb) {
    time7Days = Math.floor(new Date() ) - 3*86400*1000;
    console.log("time7Days: " + time7Days)

    const q = ds
    .createQuery([kind_data])
    .filter('time', '<', time7Days)
    .select('__key__');

  ds.runQuery(q, (err, entities) => {
    if (err) {
      cb(err);
      return;
    } else {
        for (i in entities) {
          //console.log("entity: "+ JSON.stringify(entities[i][ds.KEY]['id']));
          _delete(entities[i][ds.KEY]['id'], (err, success) => {
              if(err) {}
              else {
                  
              }
          });
        }
        cb(null, "done")
    }
  });
}


module.exports = {
    listDataByDeviceId: listDataByDeviceId,
    listRegisteredDevices: listRegisteredDevices,
    isDeviceIdRegistered: isDeviceIdRegistered,
    registerDeviceForUser: registerDeviceForUser,
    deleteAllOldData: deleteAllOldData,
};