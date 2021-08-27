export interface DtoBase {
	type: 'GET CURRENT STATE' | 'DIFF' | 'GET DIFFS';
}

export interface GetState extends DtoBase {
	type: 'GET CURRENT STATE';
	namespace: string;
}