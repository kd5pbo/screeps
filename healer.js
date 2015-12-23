/*L
 * healer.js
 * send a creep around to heal other creeps
 * By J. Stuart McMurray
 * Created 20151215
 * Last Modified 20151220
 */

var makeCreep = require("makeCreep");
var errs      = require("errs");

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

        /* We're done if there's no injured creeps */
        if (null === h) {
                return;
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
                c.moveTo(h);
        }
}

module.exports = handleHealer;
