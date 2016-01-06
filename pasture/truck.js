/*
 * truck.js
 * Ferries energy from a source to the spawn
 * By J. Stuart McMurray
 * Created 20151220
 * Last Modified 20151222
 */

var errs      = require("errs");
var makeCreep = require("makeCreep");
var truckBody = require("truckBody");

var tbt     = [CARRY, MOVE, CARRY, MOVE, CARRY, MOVE];
var maxbs   = 50;  /* Max creep body size */
var tfillvl = .75; /* Level at which we fill the tower */

/* handleTruck causes a truck to ferry energy from his source to a spawn. */
function handleTruck(so, suf) {

        /* Make sure the truck actually exists */
        var pref = "truck-" + so.id + "-";
        var cn = pref + suf;
        var c = Game.creeps[cn];
        if ("undefined" === typeof(c)) {
                if (!Game.sourceIsSafe[so.id]) {
                        return;
                }

                /* Make as big a truck as we can if we already have a truck
                 * somewhere. */
                if (0 < so.room.find(FIND_MY_CREEPS, {filter: function(x) {
                        return x.name.substring(0, pref.length) === pref;
                }}).length) {
                        return makeCreep(cn, truckBody(so), "truck", so.room);
                }

                return makeCreep(cn, tbt, "truck", so.room);
        }

        /* Don't bother if we're still spawning */
        if (c.spawning) {
                return;
        }

        /* 
           T
            H
             S
              E
        */

        /* If we're not full and we're near the source and there's energy,
         * pick up. */
        if ((c.carry.energy !== c.carryCapacity) &&
            (4 > c.pos.getRangeTo(so))) {
                var es = so.pos.findInRange(FIND_DROPPED_RESOURCES, 3);
                if (0 != es.length) {
                        var ne = c.pos.findClosestByPath(es);
                        if (null !== ne) {
                                return pickup(c, ne);
                        }
                }
        }

        /* If we're here, we're not picking up, so deposit if there's capacity
         * in the room and we have energy. */
        if ((0 !== c.carry.energy) &&
            (c.room.energyAvailable <= c.room.energyCapacityAvailable)) {
                return deposit(c);
        }

        /* If there's no capacity, move back near the source */
        if (!c.pos.inRangeTo(so, 2) && Game.sourceIsSafe[so.id]) {
                var ret = c.moveTo(so);
        }

        /* Nothing else to do here */
}

/* pickup sends creep c to pick up energy e */
function pickup(c, e) {
        /* Try to pick up the energy */
        var ret = c.pickup(e);
        switch (ret) {
                /* Not quite close enough */
                case ERR_NOT_IN_RANGE:
                        var mr = c.moveTo(e);
                        switch (mr) {
                                default:
                                        console.log(c.name +
                                                    "> Unable to move to "+
                                                            "energy: " +
                                                                    errs[mr]);
                                case OK:
                                        return;
                                        break;
                        }
                case OK:
                        return;
                        break;
                default:
                        console.log(c.name + "> Unable to pickup energy: " +
                                    errs[ret]);
                        break;
        }
}

/* deposit sends c back to the nearest spawn to deposit his energy.  It
 * returns true if we made a deposit or moved to storage, false otherwise. */
function deposit(c) {

        /* If we have no energy, give up */
        if (0 === c.carry.energy) {
                return false;
        }

        /* Find the nearest spawn, if we haven't already */
        if (undefined === c.memory.nearestStorageID) {
                c.memory.nearestStorageID = getNearestStorageID(c);
                if (undefined === c.memory.nearestStorageID) {
                        return;
                }
        }

        /* Get the storage object */
        var ns = Game.getObjectById(c.memory.nearestStorageID);
        if (null === ns) {
                c.memory.nearestStorageID = undefined;
                return false;
        }

        /* Make sure it has space */
        if (ns.energy >= ns.energyCapacity) {
                c.memory.nearestStorageID = undefined;
                return false;
        }

        /* Try to deposit */
        var ret = c.transfer(ns, RESOURCE_ENERGY);
        switch (ret) {
                case OK: /* Worky */
                        /* Get a new one next time */
                        c.memory.nearestStorageID = undefined;
                        return true;
                        break;
                case ERR_NOT_IN_RANGE: /* Move to it */
                        if (0 < c.fatigue) {
                                return true;
                        }
                        var mr = c.moveTo(ns);
                        if (OK === mr) {
                                return true;
                        }
                        console.log(c.name +
                                    "> Can't move to energy container: " +
                                    errs[mr] + " " + mr);
                        break;
                case ERR_FULL: /* Spawn's full */
                        /* Don't use this spawn, try again */
                        c.memory.nearestStorageID = undefined;
                        break;
                default:
                        console.log(c.name +
                                    " can't deposit energy: " + errs[ret]);
        }
        return false;
}

/* getNearestStorageID finds the id of the nearest storage to c, spawn,
 * extension, or storage that has space */
function getNearestStorageID(c) {
        /* If we have a storage (the structure) we can be less picky about
         * where to go. */
        if (undefined !== c.room.storage) {
                /* Structures that can store energy */
                var ss = c.room.find(FIND_MY_STRUCTURES, {filter: function(x) {
                        return (undefined !== x.energy) &&
                                (x.energy <
                                 (STRUCTURE_TOWER === x.structureType ?
                                  tfillvl : 1) * x.energyCapacity);
                }});
                /* If the storage isn't full, add that in as well */
                if (c.room.storage.store.energy <
                    c.room.storage.storeCapacity) {
                        ss.push(c.room.storage);
                }
                /* Get the closest */
                var c = c.pos.findClosestByPath(ss);
                return null === c ? undefined : c.id;
        }

        /* Get a list of extensions */
        var es = c.room.find(FIND_MY_STRUCTURES, {
                filter: function(x) {
                        return (STRUCTURE_EXTENSION === x.structureType) &&
                                (x.energy < x.energyCapacity);
                }
        });
        /* Return the closest */
        if (0 !== es.length) {
                var ce = c.pos.findClosestByPath(es); 
                if (null !== ce) {
                        return ce.id;
                }
        }

        /* Find a nearby unfull tower */
        var ts = c.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: function(x) {
                        return (STRUCTURE_TOWER === x.structureType) &&
                                (x.energy < (tfillvl * x.energyCapacity));
                }
        });
        if (null !== ts) {
                return ts.id;
        }
        
        /* Try to find a spawn with space */
        var ss = c.pos.findClosestByPath(FIND_MY_SPAWNS, {filter: function(x) {
                return x.energy < x.energyCapacity;
        }});
        if (null !== ss) {
                return ss.id;
        }

        ///* Find a nearby tower with space at all */
        //var ts = c.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        //        filter: function(x) {
        //                return (STRUCTURE_TOWER === x.structureType) &&
        //                        (x.energy < x.energyCapacity);
        //        }
        //});
        //if (null !== ts) {
        //        return ts.id;
        //}

        /* Put it in storage */
        if (undefined !== c.room.storage) {
                return c.room.storage.id;
        }

        return undefined;
}

module.exports = handleTruck;
