import { UsersModel } from "@/database/dynamoose_models";
import { S3Service } from "@/shared/s3_service";

export const findPictureForEachUserFavorite = async (favorites: string[], userAccess: "private" | "public") => {
    const s3Bucket = userAccess === "private" ? S3Service.SURF_BUCKET_PRIVATE : S3Service.SURF_BUCKET;
    return await Promise.all(
        favorites.map(async (favorite) => {
            const [surfBreakPK, surfBreakSK] = favorite.split("-");
            const country = surfBreakPK.split("#")[1];
            const region = surfBreakSK.split("#")[0];
            const surfBreakNameId = surfBreakSK.split("#")[1];

            const s3Prefix =
                region !== "_"
                    ? `${country}/${region}/${surfBreakNameId}`
                    : `${country}/${surfBreakNameId}`;

            const randomPhotoFromS3 = await S3Service.listBucketObjectsWithPrefix(
                s3Bucket,
                s3Prefix
            );

            const keyCount = randomPhotoFromS3?.KeyCount ?? 0;
            const contents = randomPhotoFromS3?.Contents ?? [];

            const randomIndex = keyCount > 1
                ? Math.floor(Math.random() * (keyCount - 1)) + 1 // random int between 1 and keyCount - 1
                : 0; // fallback to 0 if not enough items

            const thumbnail = contents.length
                ? `https://${s3Bucket}.s3.amazonaws.com/${contents[randomIndex].Key}`
                : "";

            return { country, region, surfBreakNameId, thumbnail };
        })
    );
};

export const findProfilePictureForEachUserFollowing = async (following: string[]) => {
    return await Promise.all(
        following.map(async (userId) => {
            const databaseUser = await UsersModel.query("id").eq(userId).exec();
            const user = databaseUser[0];
            const userHandle = user.handle;

            return { profilePicture: user?.picture, userId, handle: userHandle };
        })
    );
};