/*
 * moveTo.js
 * Move a creep along a path to somewhere
 * By J. Stuart McMurray
 * Created 20151213
 * Last Modified 20151215
 */

var errs = require("errs");

/* moveTo moves a creep c to a target t, or a long its preset path.  It
 * reurns any of the usual constants. */
function moveTo(c, t) {
        x
        /* If we're already next to t, don't bother */
        if (c.pos.isNearTo(t)) {
                return OK;
        }

        /* If we're tired, don't bother */
        if (0 < c.fatigue) {
                return OK;
        }

        /* Make sure we have a way to get there */
        if (t.id !== c.memory.pathtgt) {
                /* Save path target ID */
                c.memory.pathtgt = t.id;
                c.memory.path = undefined;
        }
        /* Try to go */
        if ("undefined" === typeof(c.memory.path)) {
                var ic = "truck" === c.memory.role ? true : false;
                c.memory.path = c.pos.findPathTo(t, {
                        ignoreCreeps: ic
                });
                if (0 === c.memory.path.length) {
                        c.memory.path = undefined;
                        return;
                }
        }
        var ret = c.moveByPath(c.memory.path);
        switch (ret) {
                case OK: /* Worky */
                        break;

                case ERR_NOT_FOUND: /* Couldn't get to the path or goal */
                        c.memory.path = undefined;
                        break;
                default:
                        console.log(c.name + "> Unable to move: " + errs[ret]);
        }
        return ret;
}

module.exports = moveTo;

