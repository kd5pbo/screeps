/*
 * makeCreep.js
 * Make a creep in a smarter way
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151216
 */

var busySpawns = {};

/* makeCreep tries to make a creep named n with body array b and role ro in
 * room rm. */
function makeCreep(n, b, ro, rm) {
        /* Get the spawns for the room that can create a harvester. */
        var sps = rm.find(FIND_MY_SPAWNS, {
                filter: function(s){
                        return (OK === s.canCreateCreep(b, n, {"role": ro})) &&
                                !(true === busySpawns[s.id]);
                }
        });
        /* Make sure there's at least one */
        if (0 === sps.length) {
                return "no spawns";
        }
        /* Spawn to create creep */
        var sp = sps[0];
        var ret = sp.createCreep(b, n, {"role": ro});
        busySpawns[sp.id] = true;
        return ret;
}

module.exports = makeCreep;
