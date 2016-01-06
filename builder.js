/*
 * builder.js
 * Handles builder activities
 * By J. Stuart McMurray
 * Created 20151214
 * Last Modified 20151220
 */

var makeCreep = require("makeCreep");
var errs      = require("errs");

var ba           = [CARRY, MOVE, WORK, MOVE]; /* Body array */
var workMoveCost = 250;                       /* Cost of [WORK, MOVE] */
var maxBP        = 50;                        /* Maximum number of parts */

var repfrac = .75; /* Health below this indicates a need for repair */

/* handleBuilders */

/* handleBuilder handles the builder named n in room r. */
function handleBuilder(n, r) {

        /* Make sure we have a builder */
        var c = Game.creeps[n];
        if ("undefined" === typeof(c)) {
                return makeBuilder(n, r);
        }
        
        /* Make sure we're not spawning */
        if (c.spawning) {
                return;
        }

        /* If we're empty, try to collect more */
        if (0 === c.carry.energy) {
                collect(c);
        }
        /* If we still are, try again later */
        if (0 === c.carry.energy) {
                return;
        }

        /* Try to get energy, construct, and repair, in that order. */
        if (construct(c) || repair(c)) {
                return;
        }

        /* Failing all that, upgrade the controller */
        if (ERR_NOT_IN_RANGE === c.upgradeController(c.room.controller)) {
                c.moveTo(c.room.controller);
        }

        return;
}

/* construct finds the nearest construction project to c and has c build it.
 * It returns false if there's no constructon sites or another error occurrs,
 * and true if it managed to construction (or at least move to one). */
function construct(c) {
        /* Get the nearest construction site if we're not working on one. */
        if ("undefined" === typeof(c.memory.constructionsiteid)) {
                var bs = c.room.find(FIND_MY_CONSTRUCTION_SITES);
                /* Upgrade the controller if we've nothing else to do */
                if (0 === bs.length) {
                        return false;
                }
                var cb = c.pos.findClosestByPath(bs);
                if (null === cb) {
                        return false;
                }
                c.memory.constructionsiteid = cb.id;
        }

        /* Get the construction site */
        var cs = Game.getObjectById(c.memory.constructionsiteid);
        if (null === cs) {
                c.memory.constructionsiteid = undefined;
                return;
        }
        
        /* If the construction site is constructed, try again next time */
        if (cs.progress >= cs.progressTotal) {
                c.memory.constructionsiteid = undefined;
                return;
        }

        /* Try to build there */
        var br = c.build(cs);
        switch (br) {
                /* Okish things */
                case ERR_NOT_IN_RANGE:
                        c.moveTo(cs);
                case OK:
                        return true;
                        break;

                /* No worky things */
                case ERR_INVALID_TARGET:
                        c.memory.constructionsiteid = undefined;
                case ERR_NOT_ENOUGH_RESOURCES:
                default:
                        console.log(c.name + "> Unable to build " +
                                    cs.structureType + " at " + cs.pos + ": " +
                                            errs[br]);
                        return false;
                        break;
        }
        /* Shouldn't ever get here */
        return false;
}

/* repair tries to get c to repair a structure.  It returns true if all went
 * according to plan or false if there's nothing to repair. */
function repair(c) {
        /* Work out if anything needs fixing */
        if (undefined === c.memory.repairsiteid) {
                c.memory.repairsiteid = nearestDamagedBuildingId(c);
                if (undefined === c.memory.repairsiteid) {
                        return false;
                }
        }

        /* Get the object to repair */
        var or = Game.getObjectById(c.memory.repairsiteid);
        if (null === or) {
                c.memory.repairsiteid = undefined;
                return false;
        }
        if (or.hits === or.hitsMax) {
                c.memory.repairsiteid = undefined;
                return true;
        }

        /* Try to repair the structure */
        var ret = c.repair(or);
        switch (ret) {
                case OK:
                        return true;
                        break;
                case ERR_NOT_IN_RANGE:
                        /* If it's not in range, try to get to it */
                        if (c.fatigue > 0) {
                                return true;
                        }
                        var mr = c.moveTo(or);
                        switch (mr) {
                                case OK:
                                        return true;
                                        break;
                                default:
                                console.log(c.name + "> Unable to move to a "
                                            + or.structureType +
                                                    " to repair it: "
                                                    + errs[mr]);
                                case ERR_NO_PATH:
                                        return false;
                                        break
                        }
                        break;
                default:
                        console.log(c.name + "> Unable to repair " +
                                    or.structureType + " at " + or.pos + ": " +
                                            errs[ret]);
                        return false;
                        break;
        }
        /* Shouldn't get here */
        return false;
}

/* nearestDamagedBuildingId returns the ID of the nearest damaged building to
 * c. */
function nearestDamagedBuildingId(c) {
        var ts = [FIND_MY_SPAWNS, FIND_MY_STRUCTURES];
        /* Try the various things that can be fixed */
        for (var i = 0; i < ts.length; ++i) {
                /* Get a list of the ones that aren't healthy */
                var is = c.pos.findClosestByPath(ts[i], {filter: function(x) {
                        return x.hits <= (x.hitsMax * repfrac);
                }});
                /* Return the ID of the nearest */
                if (null !== is) {
                        return is.id;
                }
        }
        return undefined;
}

/* Collect sends creep in room r to the nearest spawn to collect energy.  It
 * returns true if we're at capacity, or false if we need to collect more or
 * move to a spawn (which collect will do). */
function collect(c) {
        /* If we're full, we're done */
        if (c.carry.energy === c.carryCapacity) {
                return true;
        }

        /* Get the storage or nearest spawn */
        var ns = c.room.storage;
        if (undefined === ns) {
                ns = getNearestSpawn(c);
                if (undefined === ns) {
                        return false;
                }
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
                case ERR_NOT_ENOUGH_ENERGY:
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

/* makeBuilder makes a building creep named n in room r */
function makeBuilder(n, r) {
        /* If we don't have storage, make the cheap model */
        if (undefined === r.storage) {
                return makeCreep(n, ba, "builder", r);
        }
        /* If we do, try to build as many building parts as we can */
        var bba = ba.slice();
        
        /* Total storage in the room */
        var ts = r.energyCapacityAvailable;

        /* Subtract the storage in spawns */
        var ss = r.find(FIND_MY_SPAWNS);
        for (var i = 0; i < ss.length; ++i) {
                ts -= ss[i].energyCapacity;
        }

        /* Subtract the parts of the body we already have */
        for (var i = 0; i < bba.length; ++i) {
                ts -= BODYPART_COST[bba[i]];
        }

        /* With the remaining budget, add work/move pairs */
        while (ts >= workMoveCost && ((bba.length + 4) < maxBP)) {
                bba.push(CARRY);
                bba.push(MOVE);
                bba.push(WORK);
                bba.push(MOVE);
                ts -= workMoveCost;
        }

        return makeCreep(n, bba, "builder", r);
}
module.exports = handleBuilder;
