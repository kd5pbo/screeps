/*L
 * healer.js
 * send a creep around to heal other creeps
 * By J. Stuart McMurray
 * Created 20151215
 * Last Modified 20151220
 */

var makeCreep = require("makeCreep");
var errs      = require("errs");

var hospitalName = "Hospital"; /* Hospital flag name */

var hbt = [HEAL, MOVE];

/* handleHealer sends a healer named n around r to heal wounded creeps */
function handleHealer(n, r) {
        /* Make sure we have a healer */
        var c = Game.creeps[n];
        if ("undefined" === typeof(c)) {
                makeCreep(n, hbt, "healer", r);
                return;
        }

        /* Do nothing if we're spawning */
        if (c.spawning) {
                return;
        }

        /* If we can't heal, die */
        for (var i = 0; i < c.body.length; i++) {
                if (HEAL === c.body[i].type && 0 === c.body[i].hits) {
                        c.suicide();
                        return;
                }
        }

        /* Find the creeps in the room */
        var h = c.pos.findClosestByPath(FIND_MY_CREEPS, {filter: function(x) {
                return x.hits < x.hitsMax;
        }});

        /* If there's no injured creeps. */
        if (null === h) {
                /* Find the hospital */
                return goToRally(c);
        }

        /* Try to heal the creep */
        var ret = c.heal(h);
        switch (ret) {
                case OK:
                case ERR_NOT_IN_RANGE:
                        break;
                default:
                        console.log(c.name + "> Unable to heal " + h.name + ": " + errs[ret]);
                        break;
        }

        /* Try to get closer */
        if (!c.pos.isNearTo(h)) {
                return c.moveTo(h);
        }
}

/* goToHospital moves c to the room's hospital. */
function goToRally(c) {
        /* Don't bother if we're tired */
        if (0 !== c.fatigue) {
                return;
        }
        /* Get the location of the campus martius if we don't have it
         * already. */
        if ("undefined" === typeof(c.memory.rallyPoint)) {
                /* Find the Campus Martius */
                var fs = c.room.find(FIND_FLAGS, {
                        filter: function(x){
                                return hospitalName === x.name;
                        }
                });
                /* Keep its ID */
                if (0 !== fs.length) {
                        c.memory.rallyPoint =
                                c.pos.findClosestByPath(fs).id;
                /* If we don't have one, use the controller */
                } else {
                        c.memory.rallyPoint = c.room.controller.id;
                }
        }
        /* Move to the rally point, or maybe the controller */
        var rp = Game.getObjectById(c.memory.rallyPoint);
        if (null === rp) {
                c.moveTo(c.room.controller);
                Game.getObjectById = undefined;
        }
        return c.moveTo(rp);
}

module.exports = handleHealer;
