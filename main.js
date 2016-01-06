/*
 * main.js
 * Main screeps script
 * By J. Stuart McMurray
 * Created 20151212
 * Last Modified 20151223
 */

var handleBuilder = require("builder");
var handleDefense = require("defense");
var handleHealer  = require("healer");
var handleSource  = require("source");
var handleStorage = require("storage");
var handleTowers  = require("tower");

var nBuild = 3; /* Number of builders */
var nDef   = 0; /* Number of defenders */
var nHeal  = 0; /* Number of healers */
var nTruck = 3; /* Number of trucks per source */

module.exports.loop = function() {
        switch (Memory.crashed) {
                case true:
                        console.log("CRASH!");
                case undefined:
                case false:
                        Memory.crashed = true;
                        break;
        }
        /* Source -> safety mappings */
        Game.sourceIsSafe = {};

        /* Loop over rooms */
	for (var i in Game.rooms) {
                /* Get the room and check we own the controller */
                var r = Game.rooms[i];
                var rc = r.controller;
                if ("undefined" === typeof(rc)) {
                        /* No controller */
                        continue;
                }

                /* Ignore rooms we don't own */
                if (!rc.my) {
                        continue;
                }

                /* Note every time we've made a new storage or spawn */
                var ns = r.find(FIND_MY_SPAWNS);
                var ne = r.find(FIND_MY_STRUCTURES, {filter: function(x) {
                        return STRUCTURE_EXTENSION === x.buildingType;
                }})
                var n = 0;
                if (null !== ns) {
                        n += ns.length;
                }
                if (null != ne) {
                        n += ne.length;
                }
                if (r.memory.nSpawn !== n) {
                        r.memory.nSpawn = n;
                        Game.newLargeStorage = true;
                }

                /* Get hostile creeps and hostile moving creeps */
                Game.hostileCreeps = r.find(FIND_HOSTILE_CREEPS);
                Game.hostileMovingCreeps = r.find(FIND_HOSTILE_CREEPS, {
                        filter: function(x) {
                                return "Source Keeper" === x.owner.username;
                        }
                });

                /* Handle sources */
                var ss = r.find(FIND_SOURCES)
                for (var i in ss) {
                        handleSource(ss[i], nTruck);
                }

                /* Move energy from the storage */
                handleStorage(r.storage);

                /* Let the towers tower */
                handleTowers(r);

                /* After all that, make a builder */
                for (var i = 0; i < nBuild; ++i) {
                        handleBuilder("builder-"+i, r);
                }

                /* Send a healer around */
                for (var i = 0; i < nHeal; ++i) {
                        handleHealer("healer-"+i, r);
                        handleHealer("healer-"+i, r);
                }

                /* Handle a few defenders */
                for (var i = 0; i < nDef; ++i) {
                        handleDefense("defense-"+i, r);
                }
	}
        Memory.crashed = false;
}

/* Check if we have a creep of the specified role in this room */
function haveRole(ro, rm) {
        return haveEnoughRole(1, ro, rm);
}

/* haveEnoughRole returns true if there's at least n creeps with role ro in
 * room r. */
function haveEnoughRole(n, ro, rm) {
        var cs = rm.find(FIND_MY_CREEPS, {
                filter: function(x){return x.memory.role === ro}
        });
        return n <= cs.length;
}
