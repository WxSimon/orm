const _merge = require('lodash.merge')

const Sync = require("@fxjs/sql-ddl-sync").Sync;

export function sync (opts, cb) {
	var sync = new Sync({
		driver  : this,
		debug   : false //function (text) { console.log(text); }
	});

	var setIndex = function (p: FxOrmNS.OrigDetailedModelPropertyHash, v: FxOrmNS.OrigDetailedModelProperty, k: string) {
		v.index = true;
		p[k] = v;
	};
	var props: FxOrmNS.OrigDetailedModelPropertyHash = {};

	if (this.customTypes) {
		for (var k in this.customTypes) {
			sync.defineType(k, this.customTypes[k]);
		}
	}

	sync.defineCollection(opts.table, opts.allProperties);

	for (var i = 0; i < opts.many_associations.length; i++) {
		props = {};

		_merge(props, opts.many_associations[i].mergeId);
		_merge(props, opts.many_associations[i].mergeAssocId);
		Object.entries(props).forEach(([k, v]) => setIndex(props, v, k))
		_merge(props, opts.many_associations[i].props);

		sync.defineCollection(opts.many_associations[i].mergeTable, props);
	}

	sync.sync(cb);

	return this;
};

export function drop (opts, cb) {
	var i, queries = [], pending;

	queries.push("DROP TABLE IF EXISTS " + this.query.escapeId(opts.table));

	for (i = 0; i < opts.many_associations.length; i++) {
		queries.push("DROP TABLE IF EXISTS " + this.query.escapeId(opts.many_associations[i].mergeTable));
	}

	pending = queries.length;

	for (i = 0; i < queries.length; i++) {
		this.execQuery(queries[i], function (err) {
			if (--pending === 0) {
				return cb(err);
			}
		});
	}

	return this;
};
