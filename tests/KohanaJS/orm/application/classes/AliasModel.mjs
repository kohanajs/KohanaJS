import ORM from '../../../../../classes/ORM';
class AliasModel extends ORM{
}

AliasModel.tableName = 'testmodels';
AliasModel.joinTablePrefix = 'testmodel';

export default AliasModel;