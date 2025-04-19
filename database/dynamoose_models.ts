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

const surfBreakMediaUploadProgressSchema = new dynamoose.Schema({
    PK: {
        type: String,
        required: true,
        hashKey: true,  // Partition Key (USER#userId)
    },
    SK: {
        type: String,
        required: true,
        rangeKey: true, // Sort Key (UPLOAD#country#region#surfBreak#uuid) if not region then (UPLOAD#country#_#surfBreak#uuid)
    },
    success: {
        type: Number,
        default: 0
    },
    error: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
}, {
    "saveUnknown": true,
    "timestamps": true
});
export const SurfBreakMediaUploadProgressModel = dynamoose.model(`${process.env.STAGE}-SurfBreakMediaUploadProgress`, surfBreakMediaUploadProgressSchema, { create: false });

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
    countries: {
        type: Array,
        default: []
    },
    handleChanged: {
        type: Boolean,
        default: false
    },
    coordinates: {
        type: Object,
        default: {}
    },
    currentLocation: {
        type: String,
        default: ""
    },
    instagram: {
        type: String,
        default: ""
    },
    website: {
        type: String,
        default: ""
    },
    youtube: {
        type: String,
        default: ""
    },
    bio: {
        type: String,
        default: ""
    },
    followers: {
        type: Array, // Array of user IDs
        default: []
    },
    following: {
        type: Array, // Array of user IDs
        default: []
    },
    favorites: {
        type: Array, // Array of surf break PK-SKs
        default: []
    },
    access: {
        type: String,
        enum: ['private', 'public'],
        default: 'public'
    }
}, {
    "saveUnknown": true,
    "timestamps": true
});
export const UsersModel = dynamoose.model(`${process.env.STAGE}-Users`, userSchema, { create: false });

const conversationSchema = new dynamoose.Schema(
    {
        id: {
            type: String,
            required: true,
            hashKey: true
        },
        userId: {
            type: String,
            required: true,
            rangeKey: true,
            index: {
                type: 'global', // Make this a global secondary index
                name: 'UserIndex', // Index name
                project: true, // Project all attributes
            },
        },
        photographerId: {
            type: String, // user id
            required: true,
            index: {
                type: 'global',
                name: 'PhotographerIndex',
                project: true,
            }
        },
        lastMessage: {
            type: String,
            required: false,
            default: "",
        },
        unreadMessages: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);
export const ConversationsModel = dynamoose.model(`${process.env.STAGE}-Conversations`, conversationSchema, { create: false });

export const messageSchema = new dynamoose.Schema(
    {
        id: {
            type: String,
            required: true,
            hashKey: true,
        },
        conversationId: {
            type: String,
            required: true,
            rangeKey: true,
            index: {
                type: "global", // Make this a global secondary index
                name: "ConversationIndex", // Index name
                project: true, // Project all attributes
            },
        },
        sender: {
            type: String, // user id
            required: true,
        },
        body: {
            type: String,
            required: false,
            default: "",
        },
        media: {
            type: Array,
            required: false,
            default: [],
        },
        error: {
            type: String,
            required: false,
            default: "",
        },
    },
    { timestamps: true }
);
export const MessagesModel = dynamoose.model(`${process.env.STAGE}-Messages`, messageSchema, { create: false });

export const notificationSchema = new dynamoose.Schema(
    {
        id: {
            type: String,
            required: true,
            hashKey: true,
        },
        userId: {
            type: String,
            required: true,
            rangeKey: true,
            index: {
                type: "global", // Make this a global secondary index
                name: "UserIndex", // Index name
                project: true, // Project all attributes
            },
        },
        body: {
            type: String,
            required: false,
            default: "",
        },
        read: {
            type: Boolean,
            default: false,
        },
        resourceId: {
            type: String, // id of the resource that the notification is related to
            required: false,
            default: "",
        },
        resourceType: {
            type: String, // type of the resource that the notification is related to
            required: false,
            default: "",
        },
    },
    { timestamps: true }
);
export const NotificationsModel = dynamoose.model(`${process.env.STAGE}-Notifications`, notificationSchema, { create: false });