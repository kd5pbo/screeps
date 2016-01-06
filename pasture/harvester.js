/*
 * harvester.js
 * Send a harvester to a source and back to a spawn
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151223
 */

var makeCreep = require("makeCreep");
var errs      = require("errs");

/* Body type for a harvester */
var lob  = [MOVE, WORK];                                     /* Cheap body */
var hib  = [MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK]; /* Big body */
var hicost = 700;                                            /* BB cost */

/* handleHarvester handles the harvester for source so with name suffix suf and
 * back */
function handleHarvester(so) {
        /* Get hold of the creep */
        var cn = "harvester-"+so.id;
        var c = Game.creeps[cn];

        /* If there's no creep, make one if his source is safe. */
        if ("undefined" === typeof(c)) {
                if (!Game.sourceIsSafe[so.id]) {
                        return;
                }

                /* Work out if we have a harvester in the room already */
                var hh = 0 < so.room.find(FIND_MY_CREEPS, {
                        filter: function(x) {
                                return "harvester" === x.memory.role;
                        }
                }).length;

                /* If we have a harvester and enough energy storage,
                 * make a bigger harvester */
                var hbt = (hh && (so.room.energyCapacityAvailable >= hicost)) ?
                        hib : lob;

                /* Make the harvester */
                makeCreep(cn, hbt, "harvester", so.room);
                return;
        }

        /* Don't bother if the creep's spawning */
        if (c.spawning) {
                return;
        }

        /* Try to harvest */
        harvest(c, so);
}

/* harvest sends a creep c to energy source so to harvest */
function harvest(c, so) {
        /* Try to get some energy */
        var ret = c.harvest(so);
        switch (ret) {
                /* Worky */
                case OK:
                case ERR_NOT_ENOUGH_ENERGY:
                        return;
                        break;
                /* Need to get there */
                case ERR_NOT_IN_RANGE:
                        if (Game.sourceIsSafe[so.id]) {
                                if (0 < c.fatigue) {
                                        return;
                                }
                                var mr = c.moveTo(so);
                                if (OK === mr || ERR_NOT_FOUND == mr) {
                                        return;
                                }
                                console.log(c.name +
                                            "> Unable to get to source: " +
                                            errs[mr]);
                                return;
                        }
                        break;
                default:
                        console.log(c.name +
                                   " Can't harvest: " + errs[ret] +
                                   "(" + ret + ")");
                        break;
        }
}

module.exports = handleHarvester;
