/*
 * main.js
 * Main screeps script
 * By J. Stuart McMurray
 * Created 20151212
 * Last Modified 20151222
 */

var handleSource  = require("source");
var handleDefense = require("defense");
var handleBuilder = require("builder");
var handleHealer  = require("healer");

var nDef   = 8; /* Number of defenders */
var nHeal  = 4;  /* Number of healers */
var nBuild = 5;  /* Number of builders */

module.exports.loop = function() {
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

                /* Get hostile creeps and hostile moving creeps */
                Game.hostileCreeps = r.find(FIND_HOSTILE_CREEPS);
                Game.hostileMovingCreeps = r.find(FIND_HOSTILE_CREEPS, {
                        filter: function(x) {
                                return "Source Keeper" === x.owner.username;
                        }
                });

                /* Handle sources */
                var ss = r.find(FIND_SOURCES_ACTIVE)
                for (var i in ss) {
                        handleSource(ss[i]);
                }

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
