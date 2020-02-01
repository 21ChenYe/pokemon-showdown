"use strict";Object.defineProperty(exports, "__esModule", {value: true});/**
 * Team Validator
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Spawns a child process to validate teams.
 *
 * @license MIT
 */

var _crashlogger = require('../.lib-dist/crashlogger');



 class TeamValidatorAsync {
	

	constructor(format) {
		this.format = Dex.getFormat(format);
	}

	validateTeam(team, removeNicknames = false) {
		let formatid = this.format.id;
		if (this.format.customRules) formatid += '@@@' + this.format.customRules.join(',');
		return exports.PM.query({formatid, removeNicknames, team});
	}

	static get(format) {
		return new TeamValidatorAsync(format);
	}
} exports.TeamValidatorAsync = TeamValidatorAsync;

 const get = TeamValidatorAsync.get; exports.get = get;

/*********************************************************
 * Process manager
 *********************************************************/

var _processmanager = require('../.lib-dist/process-manager');

 const PM = new (0, _processmanager.QueryProcessManager)(module, async message => {
	const {formatid, removeNicknames, team} = message;
	const parsedTeam = Dex.fastUnpackTeam(team);

	let problems;
	try {
		problems = _teamvalidator.TeamValidator.get(formatid).validateTeam(parsedTeam, removeNicknames);
	} catch (err) {
		_crashlogger.crashlogger.call(void 0, err, 'A team validation', {
			formatid,
			team,
		});
		problems = [`Your team crashed the team validator. We've been automatically notified and will fix this crash, but you should use a different team for now.`];
	}

	if (problems && problems.length) {
		return '0' + problems.join('\n');
	}
	const packedTeam = Dex.packTeam(parsedTeam);
	// console.log('FROM: ' + message.substr(pipeIndex2 + 1));
	// console.log('TO: ' + packedTeam);
	return '1' + packedTeam;
}); exports.PM = PM;

var _repl = require('../.lib-dist/repl');
var _dex = require('../.sim-dist/dex');
var _teamvalidator = require('../.sim-dist/team-validator');

var _configloader = require('./config-loader');

if (!exports.PM.isParentProcess) {
	// This is a child process!
	global.Config = _configloader.Config;

	global.TeamValidator = _teamvalidator.TeamValidator;

	// @ts-ignore ???
	global.Monitor = {
		crashlog(error, source = 'A team validator process', details = null) {
			const repr = JSON.stringify([error.name, error.message, source, details]);
			// @ts-ignore
			process.send(`THROW\n@!!@${repr}\n${error.stack}`);
		},
	};

	if (_configloader.Config.crashguard) {
		process.on('uncaughtException', (err) => {
			Monitor.crashlog(err, `A team validator process`);
		});
		// Typescript doesn't like this call
		// @ts-ignore
		process.on('unhandledRejection', (err, promise) => {
			if (err instanceof Error) {
				Monitor.crashlog(err, 'A team validator process Promise');
			}
		});
	}

	global.Dex = _dex.Dex.includeData();
	global.toID = Dex.getId;

	// tslint:disable-next-line: no-eval
	_repl.Repl.start(`team-validator-${process.pid}`, cmd => eval(cmd));
} else {
	exports.PM.spawn(global.Config ? _configloader.Config.validatorprocesses : 1);
}
