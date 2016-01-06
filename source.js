/*
 * source.js
 * Handle sources
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151220
 */

var handleHarvester = require("harvester");
var handleTruck = require("truck");

var truckDist = 5; /* Allocate one truck for every this many tiles to the
                    * nearest source */
var maxTrucks = 5; /* Maximum number of trucks per source */
var minTrucks = 2; /* Minimum number of trucks per source */
var maxHarvesters = 5; /* Maximum number of harvesters needed at a source */

/* Handles extracting energy from sources.  Expects a source as the sole
 * argument. */
function handleSource(so, ntruck){

        /* Work out if the source is safe */
        if ("undefined" === typeof(Game.sourceIsSafe[so.id])) {
                var hs = so.pos.findInRange(FIND_HOSTILE_CREEPS, 4);
                Game.sourceIsSafe[so.id] = (0 === hs.length);
        }

        /* Allocate memory for this source */
        if (undefined === Memory[so.id]) {
                Memory[so.id] = {};
        }

        /* Work out how many trucks we need if we don't already know or if
         * something changes. */
        if (Game.newLargeStorage || (undefined === Memory[so.id].nTrucks)) {
                Memory[so.id].nTrucks = nTrucks(so);
        }
        /* If we still don't have a number of trucks, that's bad */
        if (undefined === Memory[so.id].nTrucks) {
                console.log("Can't figure out how many trucks for " + so.id);
                return
        }

        /* Have N trucks per source */
        for (var i = 0; i < Memory[so.id].nTrucks; ++i) {
                handleTruck(so, i);
        }
        
        /* Harvest */
        handleHarvester(so);
}

/* nSpots gets the number of spots available for harvesting for a source */
/* DEAD */
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

/* nTrucks works out how many trucks a source should have */
function nTrucks(so) {
        /* Get the room's spawns */
        var ss = so.room.find(FIND_MY_SPAWNS);

        /* Add in the storage */
        if (undefined !== so.room.storage) {
                ss.push(so.room.storage);
        }

        /* Find the closest by path */
        var ns = so.pos.findClosestByPath(ss, {ignoreCreeps: true});
        if (null === ns) {
                return undefined;
        }


        /* Get that path */
        var p = so.pos.findPathTo(ns, {ignoreCreeps: true});
        if (0 === p.length) {
                return undefined;
        }

        /* Work out how many trucks it allows */
        var nt = Math.floor(p.length / truckDist);
        if (nt <= minTrucks) {
                return minTrucks;
        }
        if (nt >= maxTrucks) {
                return maxTrucks;
        }
        return nt;
}

module.exports=handleSource;
