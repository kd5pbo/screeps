/*
 * truck.js
 * Ferries energy from a source to the spawn
 * By J. Stuart McMurray
 * Created 20151220
 * Last Modified 20151222
 */

var errs      = require("errs");
var makeCreep = require("makeCreep");

var tbt = [CARRY, CARRY, MOVE, MOVE];

/* handleTruck causes a truck to ferry energy from his source to a spawn. */
function handleTruck(so, suf) {
        /* Creep name suffix */
        var cns = "-"+so.id+"-"+suf;

        /* Make sure the harvester actually exists */
        var h = Game.creeps["harvester"+cns];
        if ("undefined" === typeof(h)) {
                return;
        }

        /* Make sure the truck actually exists */
        var cn = "truck" + cns;
        var c = Game.creeps[cn];
        if ("undefined" === typeof(c)) {
                if (!Game.sourceIsSafe[so.id]) {
                        return;
                }
                return makeCreep(cn, tbt, "truck", so.room);
        }

        /* Don't bother if we're still spawning */
        if (c.spawning) {
                return;
        }

        /* If we're empty or there's no more capacity in the room, move to the
         * harvester */
        if (0 == c.carry.energy ||
            c.room.energyAvailable >= c.room.energyCapacityAvailable) {
                /* Move to the harvester if we're not there and the source is
                 * safe. */
                if (!c.pos.isNearTo(h) && Game.sourceIsSafe[so.id]) {
                        return c.moveTo(h);
                }
        }

        /* See if there's any energy nearby */
        var es = c.pos.findInRange(FIND_DROPPED_RESOURCES, 2);

        /* If there's none around and we have something to deposit, deposit
         * it. */
        var rc = c.carry.energy + ("undefined" === typeof(c.carry.power) ?
                                   0 : c.carry.power);
        if ((c.carryCapacity === rc) ||
            (0 === es.length && 0 !== c.carry.energy)) {
                return deposit(c);
        }

        /* Try to pick up the nearest energy */
        var ne = c.pos.findClosestByPath(es);
        if (null === ne) {
                return;
        }
        /* Try to pick up the energy */
        var ret = c.pickup(ne);
        switch (ret) {
                /* Not quite close enough */
                case ERR_NOT_IN_RANGE:
                        c.moveTo(ne);
                case OK:
                        return;
                        break;
                default:
                        console.log(c.name + "> Unable to pickup: " +
                                    errs[ret]);
                        break;
        }
}

/* deposit sends c back to the nearest spawn to deposit his energy */
function deposit(c) {

        /* If we have no energy, give up */
        if (0 === c.carry.energy) {
                return;
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
                return;
        }

        /* Make sure if has space */
        if (ns.energy >= ns.energyCapacity) {
                c.memory.nearestStorageID = undefined;
                return
        }

        /* Try to deposit */
        var ret = c.transfer(ns, RESOURCE_ENERGY);
        switch (ret) {
                case OK: /* Worky */
                        /* Get a new one next time */
                        c.memory.nearestStorageID = undefined;
                        return;
                        break;
                case ERR_NOT_IN_RANGE: /* Move to it */
                        if (0 < c.fatigue) {
                                return;
                        }
                        var mr = c.moveTo(ns);
                        if (OK === mr) {
                                return;
                        }
                        console.log(c.name +
                                    "> Can't move to the nearest spawn: " +
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
}

/* findNearestStorage finds the id of the nearest storage to c, spawn,
 * extension, or storage that has space */
function getNearestStorageID(c) {
        /* Find a nearby extension or tower */
        var es = c.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: function(x) {
                        return ((STRUCTURE_EXTENSION === x.structureType) ||
                                (STRUCTURE_TOWER === x.structureType)) &&
                                        (x.energy < x.energyCapacity);
                }
        });
        if (null !== es) {
                return es.id;
        }

        /* Try to find a spawn with space */
        var ss = c.pos.findClosestByPath(FIND_MY_SPAWNS, {filter: function(x) {
                return x.energy < x.energyCapacity;
        }});
        if (null != ss) {
                return ss.id;
        }
        
        /* Failing that, try the room's storage */
        if (undefined !== c.room.storage) {
                return c.room.storage.id;
        }

        return undefined;
}

module.exports = handleTruck;
