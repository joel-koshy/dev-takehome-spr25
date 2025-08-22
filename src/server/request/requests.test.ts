import { describe, it, expect, beforeEach } from "vitest";
import { MockItemRequest } from "@/lib/types/mock/request";
import { RequestStatus } from "@/lib/types/request";
import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import { getItemRequests, createItemRequest, editItemRequest } from "./requests";
import mockItemRequests from "@/app/api/mock/data";
import {
    InvalidInputError,
    InvalidPaginationError,
} from "@/lib/errors/inputExceptions";
import clientPromise, { getCollection } from "@/lib/db/mongodb";
import { ItemRequest } from "@/lib/types/requests/requests";
import { ObjectId } from "mongodb";
import { BatchApproveRequests, BatchDeleteRequests } from "../batch/requests";

const mockData: ItemRequest[] = mockItemRequests.map((mock) => {
    const newId = new ObjectId();
    return {
        _id: newId, //To match DB and local
        id: newId,

        requestorName: mock.requestorName,
        itemRequested: mock.itemRequested,
        requestCreatedDate: new Date(mock.requestCreatedDate),
        lastEditedDate: mock.lastEditedDate
            ? new Date(mock.lastEditedDate)
            : null,
        status: mock.status,
    };
});

async function clearDB() {
    const col = await getCollection("test");
    await col.deleteMany({});
}

async function setUpDB(data: ItemRequest[] = mockData) {
    await clearDB();
    const col = await getCollection("test");
    await col.insertMany(data);
}

const getSortedMockData = () =>
    [...mockData].sort((a, b) => {
        const dateDiff =
            b.requestCreatedDate.getTime() - a.requestCreatedDate.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.requestorName.localeCompare(b.requestorName);
    });

describe("getItemRequests", async () => {
    await setUpDB();
    describe("when no status filter is applied", () => {
        it("should return the first page of all requests, sorted by newest date", async () => {
            const result = await getItemRequests(null, 1, "test");
            const sortedData = getSortedMockData();
            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toStrictEqual(sortedData[0].id);
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toStrictEqual(
                sortedData[PAGINATION_PAGE_SIZE - 1].id
            );
        });

        it("should return the second page of all requests, sorted by newest date", async () => {
            const result = await getItemRequests(null, 2, "test");
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toStrictEqual(
                sortedData[PAGINATION_PAGE_SIZE].id
            );
            expect(result[PAGINATION_PAGE_SIZE - 1].id).toStrictEqual(
                sortedData[2 * PAGINATION_PAGE_SIZE - 1].id
            );
        });

        it("should return an empty array for a page that is out of bounds", async () => {
            const outOfBoundsPage = mockItemRequests.length;
            const result = await getItemRequests(null, outOfBoundsPage, "test");
            expect(result).toHaveLength(0);
        });
    });

    describe("when filtering by a valid status", () => {
        it('should return the first page of "approved" requests, sorted by newest date', async () => {
            const result = await getItemRequests(
                RequestStatus.APPROVED,
                1,
                "test"
            );
            const approvedRequests = getSortedMockData().filter(
                (r) => r.status === RequestStatus.APPROVED
            );

            expect(result).toHaveLength(4);
            expect(
                result.every((r) => r.status === RequestStatus.APPROVED)
            ).toBe(true);
            expect(result[0].id).toStrictEqual(approvedRequests[0].id);
            expect(result[2].id).toStrictEqual(approvedRequests[2].id);
        });

        it('should return an empty array for the second page of "approved" requests', async () => {
            const result = await getItemRequests(
                RequestStatus.APPROVED,
                2,
                "test"
            );
            expect(result).toHaveLength(0);
        });

        it('should return the first page of "pending" requests, sorted by newest date', async () => {
            const result = await getItemRequests(
                RequestStatus.PENDING,
                1,
                "test"
            );
            const pendingRequests = getSortedMockData().filter(
                (r) => r.status === RequestStatus.PENDING
            );
            expect(result).toHaveLength(5);
            expect(
                result.every((r) => r.status === RequestStatus.PENDING)
            ).toBe(true);
            expect(result[0].id).toStrictEqual(pendingRequests[0].id);
        });
    });

    describe("when filtering by an invalid status", () => {
        it("should ignore the filter and return the first page of all requests", async () => {
            const result = await getItemRequests("invalid-status", 1, "test");
            const sortedData = getSortedMockData();

            expect(result).toHaveLength(PAGINATION_PAGE_SIZE);
            expect(result[0].id).toStrictEqual(sortedData[0].id);
        });
    });

    describe("when an invalid page number is provided", () => {
        it("should throw InvalidPaginationError for page 0", async () => {
            await expect(() =>
                getItemRequests(null, 0, "test")
            ).rejects.toThrow(InvalidPaginationError);
        });

        it("should throw InvalidPaginationError for a negative page number", async () => {
            await expect(() =>
                getItemRequests(RequestStatus.APPROVED, -1, "test")
            ).rejects.toThrow(InvalidPaginationError);
        });
    });

    describe("when filtering for a status with no matching items", () => {
        const localMockData: ItemRequest[] = [
            {
                id: new ObjectId(),
                requestorName: "Alice",
                itemRequested: "Laptop",
                requestCreatedDate: new Date("2023-01-01T10:00:00Z"),
                lastEditedDate: null,
                status: RequestStatus.PENDING,
                _id: undefined
            },
        ];

        it("should return an empty array", async () => {
            setUpDB(localMockData);

            const result = await getItemRequests(
                RequestStatus.APPROVED,
                1,
                "test"
            );
            expect(result).toHaveLength(0);

            mockItemRequests.length = 0;
        });
    });
});

describe("createItemRequest", () => {
    beforeEach(async () => {
        await clearDB();
    });

    describe("when given valid data", () => {
        it("should create a new item request and add it to the database", async () => {
            const newItemData = {
                requestorName: "John Doe",
                itemRequested: "A new standing desk",
                status: RequestStatus.APPROVED,
            };

            await createItemRequest(newItemData, "test");

            const col = await getCollection("test");
            const count = await col.countDocuments();
            const insertedItem = await col.findOne({
                requestorName: "John Doe",
            });

            expect(count).toBe(mockItemRequests.length + 1);

            expect(insertedItem).not.toBeNull();
            expect(insertedItem?.itemRequested).toBe("A new standing desk");
            expect(insertedItem?.status).toBe(RequestStatus.APPROVED);
        });

        it('should default to a "pending" status if no status is provided', async () => {
            const newItemData = {
                requestorName: "Jane Smith",
                itemRequested: "Ergonomic keyboard",
            };

            await createItemRequest(newItemData, "test");

            const col = await getCollection("test");
            const insertedItem = await col.findOne({
                requestorName: "Jane Smith",
            });

            expect(insertedItem).not.toBeNull();
            expect(insertedItem?.status).toBe(RequestStatus.PENDING);
        });
    });

    describe("when given invalid data", () => {
        it("should throw InvalidInputError if requestorName is missing", async () => {
            const invalidData = { itemRequested: "An item" };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });

        it("should throw InvalidInputError if itemRequested is missing", async () => {
            const invalidData = { requestorName: "Missing Item" };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });

        it("should throw InvalidInputError if requestorName is too short", async () => {
            const invalidData = {
                requestorName: "Bo",
                itemRequested: "A valid item",
            };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });

        it("should throw InvalidInputError if requestorName is too long", async () => {
            const longName = "a".repeat(31);
            const invalidData = {
                requestorName: longName,
                itemRequested: "A valid item",
            };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });

        it("should throw InvalidInputError if itemRequested is too short", async () => {
            const invalidData = {
                requestorName: "Valid Name",
                itemRequested: "A",
            };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });

        it("should throw InvalidInputError if itemRequested is too long", async () => {
            const longItem = "a".repeat(101);
            const invalidData = {
                requestorName: "Valid Name",
                itemRequested: longItem,
            };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });

        it("should throw InvalidInputError if an invalid status is provided", async () => {
            const invalidData = {
                requestorName: "Status Test",
                itemRequested: "A valid item",
                status: "on-hold",
            };
            await expect(
                createItemRequest(invalidData, "test")
            ).rejects.toThrow(InvalidInputError);
        });
    });
});


describe('editItemRequest', () => {

  // Reset the database before each test to ensure isolation
  beforeEach(async () => {
    await setUpDB();
  });

  // Test case group for successful edits
  describe('Successful Operations', () => {
    it('should update the status and lastEditedDate for a valid request', async () => {
      // Arrange: Get an existing item to update
      const originalItem = mockData[0];
      if(!originalItem.id || originalItem.lastEditedDate == null){
        throw new Error("Mock Data is invalid") 
      }
      const request = {
        id: originalItem.id.toHexString(),
        status: RequestStatus.APPROVED,
      };
      
      // Act: Call the function under test
      const updatedItem = await editItemRequest(request, "test");

      // Assert: Check the returned object
      expect(updatedItem).not.toBeNull();
      expect(updatedItem?.status).toBe(RequestStatus.APPROVED);
      expect(updatedItem?.lastEditedDate).not.toBeNull();

      // Assert: Verify the update in the database
      const col = await getCollection("test");
      const dbItem = await col.findOne({ id: originalItem.id });
      
      expect(dbItem).not.toBeNull();
      expect(dbItem?.status).toBe(RequestStatus.APPROVED);
      expect(dbItem?.lastEditedDate).toBeInstanceOf(Date);
      // Ensure the edited date is newer than the creation date
      expect(dbItem?.lastEditedDate?.getTime()).toBeGreaterThan(originalItem.lastEditedDate.getTime());
    });
  });

  // Test case group for invalid inputs
  describe('Invalid Inputs', () => {
    it('should throw InvalidInputError if the request body is not an object', async () => {
        await expect(editItemRequest(null, "test")).rejects.toThrow(InvalidInputError);
        await expect(editItemRequest("a string", "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError for a missing id', async () => {
        const request = { status: RequestStatus.COMPLETED };
        await expect(editItemRequest(request, "test")).rejects.toThrow(InvalidInputError);
    });
    
    it('should throw InvalidInputError for a malformed ObjectId string', async () => {
      // Arrange: Create a request with a clearly invalid ID
      const request = {
        id: 'not-a-valid-object-id',
        status: RequestStatus.COMPLETED,
      };

      // Act & Assert: Expect the function to reject with the specific error
      await expect(editItemRequest(request, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError for a missing status', async () => {
        const originalItem = mockData[1];
        if(!originalItem.id || originalItem.lastEditedDate == null){
         throw new Error("Mock Data is invalid") 
        }
        const request = { id: originalItem.id.toHexString() };
        await expect(editItemRequest(request, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError for an unrecognized status', async () => {
      // Arrange: Use a valid ID but an invalid status string
      const originalItem = mockData[1];
       if(!originalItem.id || originalItem.lastEditedDate == null){
         throw new Error("Mock Data is invalid") 
        }
 
      const request = {
        id: originalItem.id.toHexString(),
        status: 'under_review' as RequestStatus, // Cast to bypass TypeScript type checking for the test
      };

      // Act & Assert: Expect the function to reject
      await expect(editItemRequest(request, "test")).rejects.toThrow(InvalidInputError);
    });
  });

  // Test case group for edge cases
  describe('Edge Cases', () => {
    it('should return null when the ObjectId is valid but does not exist in the database', async () => {
      // Arrange: Create a new, valid ObjectId that is not in our mock data
      const nonExistentId = new ObjectId().toHexString();
      const request = {
        id: nonExistentId,
        status: RequestStatus.REJECTED,
      };

      // Act: Call the function with the non-existent ID
      const result = await editItemRequest(request, "test");

      // Assert: Expect the result to be null
      expect(result).toBeNull();
    });
  });
});


describe('BatchApproveRequests', () => {

  beforeEach(async () => {
    await setUpDB();
  });

  describe('Successful Operations', () => {
    it('should update the statuses of multiple valid requests', async () => {
      // Arrange: Select three items to update
      const itemsToUpdate = [
        { id: mockData[0]._id.toHexString(), status: RequestStatus.APPROVED },
        { id: mockData[1]._id.toHexString(), status: RequestStatus.REJECTED },
        { id: mockData[2]._id.toHexString(), status: RequestStatus.COMPLETED },
      ];

      // Act
      const result = await BatchApproveRequests(itemsToUpdate, "test");

      // Assert: Check the operation result
      expect(result.matchedCount).toBe(3);
      expect(result.modifiedCount).toBe(3);
      expect(result.errors).toHaveLength(0);

      // Assert: Verify the changes in the database
      const col = await getCollection("test");
      const updatedItem1 = await col.findOne({ _id: mockData[0]._id });
      const updatedItem2 = await col.findOne({ _id: mockData[1]._id });
      const updatedItem3 = await col.findOne({ _id: mockData[2]._id });

      expect(updatedItem1?.status).toBe(RequestStatus.APPROVED);
      expect(updatedItem2?.status).toBe(RequestStatus.REJECTED);
      expect(updatedItem3?.status).toBe(RequestStatus.COMPLETED);
    });
  });

  describe('Invalid Inputs and Edge Cases', () => {
    it('should throw InvalidInputError for a malformed ObjectId', async () => {
      const invalidRequest = [{ id: 'not-an-id', status: RequestStatus.APPROVED }];
      await expect(BatchApproveRequests(invalidRequest, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError if status is missing', async () => {
        const invalidRequest = [{ id: mockData[0]._id.toHexString() }]; // Status is missing
        await expect(BatchApproveRequests(invalidRequest as any, "test")).rejects.toThrow(InvalidInputError);
    });

    it('should throw InvalidInputError for an invalid status value', async () => {
        const invalidRequest = [{ id: mockData[0]._id.toHexString(), status: 'on_hold' }];
        await expect(BatchApproveRequests(invalidRequest as any, "test")).rejects.toThrow(InvalidInputError);
    });


    it('should only update existing items and ignore non-existent ones', async () => {
        const nonExistentId = new ObjectId().toHexString();
        const request = [
            { id: mockData[0]._id.toHexString(), status: RequestStatus.APPROVED },
            { id: nonExistentId, status: RequestStatus.REJECTED }
        ];

        const result = await BatchApproveRequests(request, "test");

        expect(result.matchedCount).toBe(1);
        expect(result.modifiedCount).toBe(1);
    });
  });
});


// --- Test Suite for BatchDeleteRequests ---
describe('BatchDeleteRequests', () => {

    beforeEach(async () => {
        await setUpDB();
    });

    describe('Successful Operations', () => {
        it('should delete multiple valid requests', async () => {
            // Arrange: Select two items to delete
            const itemsToDelete = [
                { id: mockData[0]._id.toHexString() },
                { id: mockData[1]._id.toHexString() },
            ];
            const initialCount = mockData.length;

            // Act
            await BatchDeleteRequests(itemsToDelete, "test");
            
            // Assert: Check the database state directly for deletions
            const col = await getCollection("test");
            const finalCount = await col.countDocuments();
            
            expect(finalCount).toBe(initialCount - 2);

            const deletedItem1 = await col.findOne({ _id: mockData[0]._id });
            const deletedItem2 = await col.findOne({ _id: mockData[1]._id });

            expect(deletedItem1).toBeNull();
            expect(deletedItem2).toBeNull();
        });
    });

    describe('Invalid Inputs and Edge Cases', () => {
        it('should throw InvalidInputError for a malformed ObjectId', async () => {
            const invalidRequest = [{ id: 'not-an-id' }];
            await expect(BatchDeleteRequests(invalidRequest, "test")).rejects.toThrow(InvalidInputError);
        });

        it('should only delete existing items and ignore non-existent ones', async () => {
            const nonExistentId = new ObjectId().toHexString();
            const request = [
                { id: mockData[0]._id.toHexString() },
                { id: nonExistentId }
            ];
            const initialCount = mockData.length;

            await BatchDeleteRequests(request, "test");

            const col = await getCollection("test");
            const finalCount = await col.countDocuments();
            expect(finalCount).toBe(initialCount - 1);
        });
    });
});
