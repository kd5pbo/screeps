/*
 * defense.js
 * Handles defensive creeps
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151215
 */

var makeCreep = require("makeCreep");
var errs =      require("errs");

var dbt = [
        [TOUGH, TOUGH, ATTACK, RANGED_ATTACK, MOVE]
        //[TOUGH, TOUGH, ATTACK, ATTACK, MOVE],
        //[TOUGH, RANGED_ATTACK, MOVE, MOVE],
        //[TOUGH, ATTACK, MOVE, MOVE],
];

var minFightFrac = 0.4; /* Minimum fraction of health needed to fight */

/* Rally point */
var rallyName = "Campus Martius";

/* handleDefense handles the creation and activities of a creep named n
 * defending a room r. */
function handleDefense(n, r) {

        /* Make the creep if he doesn't exist */
        var c = Game.creeps[n];
        if ("undefined" === typeof(c)) {
                /* Don't make too many if we don't have healers */
                if (Game.haveDefender && !Game.haveHealer) {
                        return;
                }
                /* Work out which body type to use */
                var ndef = 0;
                var ds = r.find(FIND_MY_CREEPS, {
                        filter: function(x) {
                                return "defender" === x.memory.role;
                        }
                });
                if (null !== ds) {
                        ndef = ds.length;
                }
                makeCreep(n, dbt[ndef % dbt.length], "defender", r);
                return;
        }

        /* Ignore spawning creeps */
        if (c.spawning) {
                return;
        }

        /* If there's no bad guys, move to either the controller or a flag */
        if ((0 === Game.hostileCreeps.length) ||
            (c.hits <= (c.hitsMax * minFightFrac))) {
                return goToRally(c);
        }

        /* If we're near to any of them and we can, attack */
        if (hasAttack(c)) {
                for (var i in Game.hostileCreeps) {
                        if (c.pos.isNearTo(Game.hostileCreeps[i])) {
                                c.attack(Game.hostileCreeps[i]);
                                return;
                        }
                }
        }

        /* Find all bad guys in range */
        var chs = c.pos.findInRange(Game.hostileCreeps, 3);

        /* Shoot the single bad guy if there's only one */
        if (1 === chs.length && hasRangedAttack(c)) {
                var ret = c.rangedAttack(chs[0]);
                if (OK !== ret) {
                        console.log(c.name + "> Ranged attack fail: " + errs[ret]);
                }
                return;
        }

        /* Shoot all the bad guys if there's more than one */
        if (1 < chs.length && hasRangedAttack(c)) {
                var rret = c.rangedMassAttack();
                if (OK !== rret) {
                        console.log("Ranged mass attack fail: " + errs[rret]);
                }
                return;
        }

        /* Can't do anything, give up if we're tired */
        if (0 < c.fatigue) {
                return;
        }


        /* Nobody in range, move towards the nearest bad guy */
        var ch = c.pos.findClosestByPath(Game.hostileMovingCreeps);
        if (null === ch) {
                ch = c.pos.findClosestByPath(Game.hostileCreeps);
                if (null == ch) {
                        return goToRally(c);
                }
        }
        var mr = c.moveTo(ch);
        if (OK !== mr) {
                console.log(c.name + "> Unable to move to "+
                            "closest bad guy: " + errs[mr]);
        }
}

/* hasRangedAttack returns true iff c has a RANGED_ATTACK body part. */
function hasRangedAttack(c) {
        return hasPart(c, RANGED_ATTACK);
}

/* hasAttack returns true iff c has an ATTACK body part. */
function hasAttack(c) {
        return hasPart(c, ATTACK);
}

/* hasPart returns true iff creep c has body part p. */
function hasPart(c, p) {
        for (var i = 0; i < c.body.length; i++) {
                if (c.body[i].type === p) {
                        return true;
                }
        }
        return false;
}

/* goToRally moves c to the room's rally point. */
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
                                return rallyName === x.name;
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

module.exports = handleDefense;
