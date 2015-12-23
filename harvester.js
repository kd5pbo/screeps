/*
 * harvester.js
 * Send a harvester to a source and back to a spawn
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151220
 */

var makeCreep = require("makeCreep");
var errs      = require("errs");

/* Body type for a harvester */
var hbt = [WORK, WORK, MOVE];

/* handleHarvester handles the harvester for source so with name suffix suf and
 * back */
function handleHarvester(so, suf) {
        /* Get hold of the creep */
        var cn = "harvester-"+so.id+"-"+suf;
        var c = Game.creeps[cn];

        /* If there's no creep, make one if his source is safe. */
        if ("undefined" === typeof(c)) {
                if (!Game.sourceIsSafe[so.id]) {
                        return;
                }
                /* If it is, make a harvester */
                makeCreep(cn, hbt, "harvester", so.room);
                return;
        }

        /* Don't bother if the creep's spawning */
        if (c.spawning) {
                return;
        }

        /* If the source is safe, and there's still capacity in the room,
         * harvest */
        if (Game.sourceIsSafe[so.id] &&
            c.room.energyAvailable < c.room.energyCapacityAvailable) {
                harvest(c, so);
                return;
        }
}

/* harvest sends a creep c to energy source so to harvest */
function harvest(c, so) {
        /* Try to get some energy */
        var ret = c.harvest(so);
        switch (ret) {
                /* Worky */
                case OK:
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
                        }
                        break;
                default:
                        console.log(c.name +
                                   " can't harvest: " + errs[ret] +
                                   "(" + ret + ")");
                        break;
        }
}

module.exports = handleHarvester;
