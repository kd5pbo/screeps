/*
 * source.js
 * Handle sources
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151220
 */

var handleHarvester = require("harvester");
var handleTruck = require("truck");

/* Maximum number of harvesters needed at a source */
var maxHarvesters = 3;

/* Handles extracting energy from sources.  Expects a source as the sole
 * argument. */
function handleSource(so){

        /* Number of harvester spots */
        var ns = nSpots(so);

        /* Work out if the source is safe */
        if ("undefined" === typeof(Game.sourceIsSafe[so.id])) {
                var hs = so.pos.findInRange(FIND_HOSTILE_CREEPS, 4);
                Game.sourceIsSafe[so.id] = (0 === hs.length);
        }

        /* Hande one harvester per spot */
        for (var i = 0; i < ns; ++i) {
                handleHarvester(so, i);
                handleTruck(so, i);
        }
        
}

/* nSpots gets the number of spots available for harvesting for a source */
function nSpots(so) {
        var op = so.pos;
        /* Make sure we have memory for this source */
        if ("undefined" === typeof(Memory[so.id])) {
                Memory[so.id] = {};
        }

        /* Work out the source's number of spots */
        if ("undefined" !== typeof(Memory[so.id].nspots)) {
                return Memory[so.id].nspots;
        }

        var ns = 8; /* Assume we start with 8 spots */
        /* Get the boxes around the source */
        var f = so.room.lookForAtArea(
                'terrain',
                so.pos.y-1,
                so.pos.x-1,
                so.pos.y+1,
                so.pos.x+1);
        /* Loop over each position */
        for (var i in f) {
                for (var j in f[i]) {
                        /* Skip the source itself */
                        if (so.pos.y + "" === i &&
                            so.pos.x + "" === j) {
                                continue;
                        }
                        /* If anything at that position is a wall,
                         * knock off one open spot */
                        for (var k in f[i][j]) {
                                if ("wall" === f[i][j][k]) {
                                        --ns;
                                }
                        }
                }
        }
        /* Save it for next time */
        Memory[so.id].nspots = ns > maxHarvesters ? maxHarvesters : ns;

        return Memory[so.id].nspots;
}

module.exports=handleSource;
