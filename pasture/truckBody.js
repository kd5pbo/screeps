/*
 * truckBody.js
 * Code to work out how big a truck to make
 * by J. Stuart McMurray
 * Created 20151228
 * Last Modified 20151228
 */

var tbt     = [CARRY, MOVE];
var maxbs   = 50;  /* Max creep body size */

/* truckBody returns an array with a truck's body parts suitable for o's room.
 * o may be any object with a room member. */
function truckBody(o) {
        /* Temporary truck body type */
        var ttbt = tbt.slice();
        /* Energy cost per carry/move segment */
        var ecs = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];

        /* Cost of base model */
        var bc = 0;
        for (var i = 0; i < ttbt.length; ++i) {
                bc += BODYPART_COST[ttbt[i]];
        }

        /* Energy storage in room */
        var eca = o.room.energyCapacityAvailable;

        /* Don't expect the spawn(s) to be full */
        var ss = o.room.find(FIND_MY_SPAWNS);
        for (var i = 0; i < ss.length; ++i) {
                eca -= ss[0].energyCapacity;
        }

        /* Subtract the cost of the first bit */
        eca -= bc;

        /* Make as big a body as we can with the available storage */
        while (eca >= ecs && ((ttbt.length + 2) < maxbs)) {
                ttbt.push(CARRY, MOVE);
                eca -= ecs;
        }

        return ttbt;
}

module.exports = truckBody;
