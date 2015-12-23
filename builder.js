/*
 * builder.js
 * Handles builder activities
 * By J. Stuart McMurray
 * Created 20151214
 * Last Modified 20151220
 */

var makeCreep = require("makeCreep");
var collect   = require("collect");
var errs      = require("errs");

var ba = [WORK, CARRY, MOVE, MOVE, MOVE];

var repfrac = .75; /* Health below this indicates a need for repair */

/* handleBuilder handles the builder named n in room r. */
function handleBuilder(n, r) {

        /* Make sure we have a builder */
        var c = Game.creeps[n];
        if ("undefined" === typeof(c)) {
                return makeCreep(n, ba, "builder", r);
        }
        
        /* Make sure we're not spawning */
        if (c.spawning) {
                return;
        }


        /* Try to get energy, repair, and construct, in that order. */
        if ((!collect(c)) || repair(c) || construct(c)) {
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
        var ss = [];
        /* Try the various things that can be fixed */
        for (var i = 0; i < ts.length; ++i) {
                /* Get a list of the ones that aren't healthy */
                var is = c.room.find(ts[i], {filter: function(x) {
                        return x.hits <= (x.hitsMax * repfrac);
                }});
                /* Return the ID of the nearest */
                if (0 !== is.length) {
                        ss = is;
                        break;
                }
        }
        /* Find walls and roads */
        if (0 === ss.length) {
                ss = c.room.find(FIND_STRUCTURES, {filter: function(x) {
                        return (x.structureType == STRUCTURE_WALL ||
                                x.structureType == STRUCTURE_ROAD) &&
                                        (x.hits <= (x.hitsMax * repfrac));
                }});
        }
        /* Work out which is closest */
        if (0 !== ss.length) {
                return c.pos.findClosestByRange(ss).id;
        }
        return undefined;
}

module.exports = handleBuilder;

