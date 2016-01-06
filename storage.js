/*
 * storage.js
 * Handle shuffling energy from the storage to the extensions
 * By J. Stuart McMurray
 * Created 20151229
 * Last Modified 20151229
 */

var errs      = require("errs");
var makeCreep = require("makeCreep");
var truckBody = require("truckBody");

var nExt = 3; /* Number of trucks to ferry data to extensions */
var stbt = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
/* Default truck body */

/* handleStorage handles sending energy from the storage to the extensions and
 * the tower */
function handleStorage(st) {
        if (undefined === st) {
                return;
        }

        /* Handle the trucks to ferry energy to the extensions */
        for (var i = 0; i < nExt; ++i) {
                handleExtensionTruck(st, i);
        }

        /* Nothing to do if we don't have a storage or it's empty. */
        if (undefined === st || 0 === st.store.energy) {
                return;
        }
}

/* handleExtensionTruck tries to send a truck (number n) from storage s to the
 * extensions in the room. */
function handleExtensionTruck(s, n) {
        /* Truck name */
        var pre = "struck-"+s.room.name+"-";
        var cn = pre + n;

        /* Make sure the truck exists */
        var c = Game.creeps[cn];
        /* If not, make a new one */
        if (undefined === c) {
                /* Work out if this storage has trucks already */
                var have = false;
                for (var i in Game.creeps) {
                        if (pre === Game.creeps[i].name.slice(0, pre.length)) {
                                have = true;
                                break;
                        }
                }
                /* If there's no trucks for this storage, make a small one */
                if (!have) {
                        return makeCreep(cn, stbt, "storagetruck", s.room);
                }
                /* Make a large truck */
                return makeCreep(cn, truckBody(s), "storagetruck", s.room);
        }

        /* Don't bother if we're spawning */
        if (c.spawning) {
                return;
        }

        /* If we have no energy and the storage does, go to the storage and
         * get some. */
        if (0 === c.carry.energy) {
                return collect(c, s);
        }

        /* Put energy in the extensions or tower */
        return deposit(c);
}

/* collect instructs the truck c to collect energy that's dropped, or failing
 * that, get energy from storage s. */
function collect(c, s) {
        /* Work out where to go if we don't already know */
        if (undefined === c.memory.collectID) {
                /* Collect from the storage until further notice */
                var cp = s;

                /* Try to find dropped energy */
                var rs = c.room.find(FIND_DROPPED_RESOURCES, {
                        filter: function(x) {
                                /* Only care about dropped energy */
                                if (RESOURCE_ENERGY !== x.resourceType) {
                                        return false;
                                }
                                /* Check all around for a source */
                                var ss = x.pos.findInRange(FIND_SOURCES_ACTIVE,
                                                           1);
                                /* If there's none, this one works */
                                return 0 === ss.length;
                        }
                });

                /* If we have dropped energy, use that */
                if (0 !== rs.length) {
                        var cr = c.pos.findClosestByPath(rs);
                        if (null !== cr) {
                                cp = cr;
                        }
                }
                
                /* Save the ID */
                c.memory.collectID = cp.id;
        }

        /* Get the target */
        if (undefined === c.memory.collectID) {
                return;
        }
        var tgt = Game.getObjectById(c.memory.collectID);
        if (null === tgt) {
                c.memory.collectID = undefined;
                return;
        }

        /* Try to retreive energy from it */
        var ret;
        if (undefined !== tgt.transfer) {
                ret = tgt.transfer(c, RESOURCE_ENERGY);
        } else {
                ret = c.pickup(tgt);
        }

        /* Move towards it if we need to */
        switch (ret) {
                default:
                        console.log(c.name + "> Unable to get energy from " +
                                    tgt + ": " + errs[ret]);
                case OK:
                        c.memory.collectID = undefined;
                        break;
                case ERR_NOT_IN_RANGE:
                        if (0 != c.fatigue) {
                                return;
                        }
                        var mr = c.moveTo(tgt);
                        if (OK === mr) {
                                return;
                        }
                        console.log(c.name + "> Unable to move to " + tgt +
                                    ": " + errs[mr]);
                        tgt = undefined;
                        break;
        }
}

/* deposit sends truck c somewhere its energy is needed */
function deposit(c) {
        /* If we don't know where to go, find something */
        if (undefined === c.memory.depositID) {
                c.memory.depositID = findDepositID(c);
        }
        /* If we failed, try again later. */
        if (undefined === c.memory.depositID) {
                return;
        }

        /* Get the target to which to transfer energy */
        var tgt = Game.getObjectById(c.memory.depositID);
        if (null === tgt) {
                c.memory.depositID = undefined;
        }

        /* Try to give it energy */
        var ret = c.transfer(tgt, RESOURCE_ENERGY);
        switch (ret) {
                default:
                        console.log(c.name + "> Unable to transfer energy "+ 
                                    "to " + tgt + ": " + errs[ret]);
                case OK:
                case ERR_FULL:
                        c.memory.depositID = undefined;
                        break;
                case ERR_NOT_IN_RANGE:
                        if (0 != c.fatigue) {
                                return;
                        }
                        var mr = c.moveTo(tgt)
                        if (OK === mr) {
                                return;
                        }
                        console.log(c.name + "> Unable to move to " + tgt +
                                    ": " + errs[mr]);
                        c.memory.depositID = undefined;
                        break;
        }
}

/* findDepositID gets the ID of an object which needs energy */
function findDepositID(c) {
        /* Get a list of candidates for targets */
        var ts = findStructuresWithSpace(c);
        
        /* If we didn't find anything, life's easy */
        if (undefined === ts) {
                return undefined;
        }

        /* Return the ID of the closest */
        if (0 !== ts.length) {
                var ct = c.pos.findClosestByPath(ts);
                if (null !== ct) {
                        return ct.id;
                }
        }


        /* Failing all of the above, return undefined */
        return undefined;
}

/* findStructureWithSpace returns a list of structures with space for more
 * energy to which truck c can deposit energy. */
function findStructuresWithSpace(c) {
        var ss = [];

        /* Try to find an empty extension. */
        ss = c.room.find(FIND_MY_STRUCTURES, {filter: function(x) {
                return (STRUCTURE_EXTENSION === x.structureType) &&
                        (x.energy < x.energyCapacity);
        }});
        if (0 !== ss.length) {
                return ss;
        }

        /* Try to find an tower that needs it */
        ss = c.room.find(FIND_MY_STRUCTURES, {filter: function(x) {
                return (STRUCTURE_TOWER === x.structureType) &&
                        ((0 === x.energy) ||
                         ((x.energy + c.carry.energy) < x.energyCapacity));
        }});
        if (0 !== ss.length) {
                return ss;
        }

        /* Failing that, try to find the closest spawn with space */
        ss = c.room.find(FIND_MY_SPAWNS, {filter: function(x) {
                return x.energy < x.energyCapacity;
        }});
        if (0 !== ss.length) {
                return ss;
        }
}
module.exports = handleStorage;
