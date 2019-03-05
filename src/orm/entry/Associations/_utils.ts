export function defineDefaultExtendsToTableName (modelTableName: string, assocName: string): string {
	return `${modelTableName}_${assocName}`
}

export function defineAssociationAccessorMethodName (
	prefixer: 'get' | 'set' | 'has' | 'remove' | 'findBy',
	assocName: string
): string {
	return `${prefixer}${assocName}`
}

export const ACCESSOR_KEYS = {
	/* common :start */
	"get": "get" as 'get',
	"set": "set" as 'set',
	"has": "has" as 'has',
	"del": "remove" as 'remove',
	"modelFindBy": "findBy" as 'findBy',
	/* common :end */
	
	// useful for association `hasMany` 
	"add": "add" as 'add',
};

export function getMapsToFromProperty (property: FxOrmProperty.NormalizedProperty) {
	return property.mapsTo || property.name
}

export function cutOffAssociatedModelFindOptions (findby_options: FxOrmAssociation.ModelAssociationMethod__FindByOptions, assocNameTplName: string) {
	let opts = null;
	if (findby_options.hasOwnProperty(assocNameTplName)) {
		const k = `${assocNameTplName}_find_options`;
		opts = findby_options[k];
		
		delete findby_options[k]
	}
		return 
	
	return opts
}