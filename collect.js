/*
 * collect.js
 * Go to a spawn, collect energy
 * By J. Stuart McMurray
 * Created 20151215
 * Last Modified 20151220
 */

var errs   = require("errs");
var moveTo = require("moveTo");

/* Collect sends creep in room r to the nearest spawn to collect energy.  It
 * returns true if we're at capacity, or false if we need to collect more or
 * move to a spawn (which collect will do). */
function collect(c) {
        /* If we're full, we're done */
        if (c.carry.energy === c.carryCapacity) {
                return true;
        }

        /* Get the nearest spawn */
        var ns = getNearestSpawn(c);
        if ("undefined" === typeof(ns)) {
                return false;
        }

        /* If we're not full, but not next to a spawn, that's ok */
        if (!c.pos.isNearTo(ns) && 0 !== c.carry.energy) {
                return true;
        }

        /* Try to collect */
        var cr = ns.transferEnergy(c);
        switch (cr) {
                /* If we're full, unset the nearest spawn */
                case ERR_FULL:
                case OK:
                        break;
                /* If we're too far, move to it */
                case ERR_NOT_IN_RANGE:
                        c.moveTo(ns);
                        return false;
                        break;
                default:
                        console.log(c.name + "> Unable to receive energy " +
                                    "from " + ns.id + ": " + errs[cr]);
                        break;
        }

        /* If we're full, we're done */
        if (c.carry.energy === c.carryCapacity) {
                return true;
        }
        return false;
}

/* getNearestSpawn gets the spawn nearest c when getNearestSpawn was first
 * called with c.  If that spawn no longer exists, it finds the nearest one. */
function getNearestSpawn(c) {
        if ("undefined" !== typeof(c.memory.nearestSpawnId)) {
                var ns = Game.getObjectById(c.memory.nearestSpawnId);
                if (null === ns) {
                        c.memory.nearestSpawnId = undefined;
                        return getNearestSpawn(c);
                }
                return ns;
        }
        /* Get the list of spawns in the room */
        var ss = c.room.find(FIND_MY_SPAWNS);
        if (0 === ss.length) {
                console.log(c.name + "> Can't find a spawn");
                return undefined;
        }
        /* Find the nearest spawn */
        var cs = c.pos.findClosestByPath(ss);
        if (null === cs) {
                console.log(c.name + "> Unable to get nearest spawn");
                return undefined;
        }
        /* Save it */
        c.memory.nearestSpawnId = cs.id;
        return cs;
}

module.exports = collect;
