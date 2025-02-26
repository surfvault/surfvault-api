import dynamoose from 'dynamoose';

const surfBreakSchema = new dynamoose.Schema({
    PK: {
        type: String,
        required: true,
        hashKey: true, // "SURFBREAK#country"
    },
    SK: {
        type: String,
        required: true,
        rangeKey: true, // "region#surfBreakNameId" OR "_#surfBreakNameId" if no region
    },
    name: {
        type: String,
        required: true,
        index: {
            type: 'global', // Make this a global secondary index
            name: 'SurfBreakNameIndex', // Index name
            project: true, // Project all attributes
        }
    },
    country: {
        type: String,
        required: true
    },
    coordinates: {
        type: Object,
        required: true
    },
    createdBy: {
        type: String,
        required: true, // Reference to a user (USER#userId)
    }
}, {
    "saveUnknown": true,
    "timestamps": true
});
export const SurfBreaksModel = dynamoose.model(`${process.env.STAGE}-SurfBreaks`, surfBreakSchema, { create: false });


const surfPhotoSchema = new dynamoose.Schema({
    PK: {
        type: String,
        required: true,
        hashKey: true,  // Partition Key (USER#userId)
    },
    SK: {
        type: String,
        required: true,
        rangeKey: true, // Sort Key (PHOTO#country#region#surfBreak#timestamp#filename.type)
    },
    s3Key: {
        type: String,
        required: true
    },
}, {
    "saveUnknown": true,
    "timestamps": true
});
export const SurfPhotosModel = dynamoose.model(`${process.env.STAGE}-SurfPhotos`, surfPhotoSchema, { create: false });


const userSchema = new dynamoose.Schema({
    id: {
        type: String,
        required: true,
        hashKey: true
    },
    email: {
        type: String,
        required: true,
        rangeKey: true,
        index: {
            type: 'global', // Make this a global secondary index
            name: 'EmailIndex', // Index name
            project: true, // Project all attributes
        },
    },
    handle: {
        type: String,
        required: true,
        index: {
            type: 'global',
            name: 'HandleIndex',
            project: true,
        }
    },
    name: {
        type: String,
        required: true
    },
    auth0Id: {
        type: String,
        required: true
    },
    picture: {
        type: String
    },
    surfBreaks: {
        type: Object,
        // : {country: {surfBreak: [dates]}}
    },
    countries: {
        type: Array,
        default: []
    },
    handleChanged: {
        type: Boolean,
        default: false
    }
}, {
    "saveUnknown": true,
    "timestamps": true
});
export const UsersModel = dynamoose.model(`${process.env.STAGE}-Users`, userSchema, { create: false });