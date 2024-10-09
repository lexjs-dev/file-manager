import fs from 'node:fs';
import path from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  suite,
} from 'vitest';
import { testSetup } from '../test-setup.js';
import type { FileOperationTreeType } from '../../src/operations/operation.types.js';
import type {
  FileInterface,
  FileTreeInterface,
} from '../../src/file-tree/file-tree.types.js';
import { buildOperationTree } from '../../src/operations/build-operation-tree.js';
import {
  buildDirOperations,
  buildFileOperations,
} from '../../src/operations/build-operations.js';
import { dirOperationMethods, fileOperationMethods } from './constants.js';

const { setup, joinPath } = testSetup('build-operation-tree', import.meta);

function getJoinTestPath(testName: string) {
  return function getJoinPath(...args: string[]): string {
    return joinPath(testName, ...args);
  };
}

suite('buildOperationTree Suite', { concurrent: false }, () => {
  const tree = {
    file1: { type: 'file' },
    file2: { type: 'file', data: 'File 2 test' },
    dir1: { type: 'dir' },
    dir2: {
      type: 'dir',
      children: {
        file1: { type: 'file' },
        file2: { type: 'file', data: (): string => 'Dir 2\nFile 2 test' },
        dir1: { type: 'dir' },
        dir2: {
          type: 'dir',
          children: {
            file1: { type: 'file', data: 'Dir 2\nDir 2\nFile 1 test' },
            file2: {
              type: 'file',
              data: (): string => 'Dir 2\nDir 2\nFile 2 test',
            },
          },
        },
      },
    },
  } satisfies FileTreeInterface;

  type Tree = typeof tree;

  beforeAll(() => {
    return setup();
  });

  describe('buildOperationTree function - core properties', () => {
    const testName = 'core-methods';
    const testDirPath = joinPath(testName);
    const joinTestPath = getJoinTestPath(testName);
    let result: FileOperationTreeType<Tree>;

    beforeEach(() => {
      fs.mkdirSync(testDirPath, { recursive: true });
      result = buildOperationTree(testDirPath, tree);
    });

    afterEach(() => {
      fs.rmSync(testDirPath, {
        force: true,
        recursive: true,
      });
    });

    it('should be defined', () => {
      expect(result).toBeDefined();
    });

    it('should have directory operation methods on result object', () => {
      dirOperationMethods.forEach((method) => {
        expect(result).toHaveProperty(method);
        expect(result[method]).toBeInstanceOf(Function);
      });
    });

    it('should have directory operation methods on directory objects', () => {
      [result.dir1, result.dir2, result.dir2.dir1, result.dir2.dir2].forEach(
        (dirObj) => {
          dirOperationMethods.forEach((method) => {
            expect(dirObj).toHaveProperty(method);
            expect(dirObj[method]).toBeInstanceOf(Function);
          });
        },
      );
    });

    it('should have file operation methods on file objects', () => {
      [
        result.file1,
        result.file2,
        result.dir2.file1,
        result.dir2.file2,
      ].forEach((dirObj) => {
        fileOperationMethods.forEach((method) => {
          expect(dirObj).toHaveProperty(method);
          expect(dirObj[method]).toBeInstanceOf(Function);
        });
      });
    });

    it('should have file and directory property names from the file tree', () => {
      expect(result).toHaveProperty('file1');
      expect(result).toHaveProperty('file2');
      expect(result).toHaveProperty('dir1');
      expect(result).toHaveProperty('dir2');
      expect(result.dir2).toHaveProperty('file1');
      expect(result.dir2).toHaveProperty('file2');
      expect(result.dir2).toHaveProperty('dir1');
      expect(result.dir2).toHaveProperty('dir2');
      expect(result.dir2.dir2).toHaveProperty('file1');
      expect(result.dir2.dir2).toHaveProperty('file2');
    });

    it('should return correct paths', () => {
      expect(result.$getPath()).toBe(testDirPath);
      expect(result.file1.$getPath()).toBe(joinTestPath('file1'));
      expect(result.file2.$getPath()).toBe(joinTestPath('file2'));
      expect(result.dir1.$getPath()).toBe(joinTestPath('dir1'));
      expect(result.dir2.$getPath()).toBe(joinTestPath('dir2'));
      expect(result.dir2.file1.$getPath()).toBe(joinTestPath('dir2', 'file1'));
      expect(result.dir2.file2.$getPath()).toBe(joinTestPath('dir2', 'file2'));
      expect(result.dir2.dir1.$getPath()).toBe(joinTestPath('dir2', 'dir1'));
      expect(result.dir2.dir2.$getPath()).toBe(joinTestPath('dir2', 'dir2'));
      expect(result.dir2.dir2.file1.$getPath()).toBe(
        joinTestPath('dir2', 'dir2', 'file1'),
      );
      expect(result.dir2.dir2.file2.$getPath()).toBe(
        joinTestPath('dir2', 'dir2', 'file2'),
      );
    });

    it('should check if files and directories from file tree exist', () => {
      const file1 = joinTestPath('file1');
      const file2 = joinTestPath('file2');
      const file3 = joinTestPath('dir2', 'file1');
      const file4 = joinTestPath('dir2', 'file2');
      const file5 = joinTestPath('dir2', 'dir2', 'file1');
      const file6 = joinTestPath('dir2', 'dir2', 'file2');
      const dir1 = joinTestPath('dir1');
      const dir2 = joinTestPath('dir2');
      const dir3 = joinTestPath('dir2', 'dir1');
      const dir4 = joinTestPath('dir2', 'dir2');

      function checkExists(value: boolean): void {
        expect(result.$exists('file1')).toBe(value);
        expect(result.$exists('file2')).toBe(value);
        expect(result.$exists('dir1')).toBe(value);
        expect(result.$exists('dir2')).toBe(value);
        expect(result.dir2.$exists('file1')).toBe(value);
        expect(result.dir2.$exists('file2')).toBe(value);
        expect(result.dir2.$exists('dir1')).toBe(value);
        expect(result.dir2.$exists('dir2')).toBe(value);
        expect(result.dir2.dir2.$exists('file1')).toBe(value);
        expect(result.dir2.dir2.$exists('file2')).toBe(value);
      }

      // expect false before files and directories are created
      checkExists(false);

      // create files and directories from the file tree
      [dir1, dir2, dir3, dir4].forEach((dir) => {
        fs.mkdirSync(dir, { recursive: true });
      });
      [file1, file2, file3, file4, file5, file6].forEach((file) => {
        fs.writeFileSync(file, '');
      });

      // expect true after files and directories are created
      checkExists(true);
    });

    it('should check if files and directories not from file tree exist', () => {
      const fileName = 'new-file';
      const dirName = 'new-dir';

      const file1 = joinTestPath(fileName);
      const file2 = joinTestPath('dir1', fileName);
      const file3 = joinTestPath('dir2', 'dir1', fileName);
      const dir1 = joinTestPath(dirName);
      const dir2 = joinTestPath('dir1', dirName);
      const dir3 = joinTestPath('dir2', 'dir1', dirName);

      function checkExists(value: boolean): void {
        expect(result.$exists(fileName)).toBe(value);
        expect(result.$exists(dirName)).toBe(value);
        expect(result.dir1.$exists(fileName)).toBe(value);
        expect(result.dir1.$exists(dirName)).toBe(value);
        expect(result.dir2.dir1.$exists(fileName)).toBe(value);
        expect(result.dir2.dir1.$exists(dirName)).toBe(value);
      }

      // expect false before new files and directories are created
      checkExists(false);

      [dir1, dir2, dir3].forEach((dir) => {
        fs.mkdirSync(dir, { recursive: true });
      });
      [file1, file2, file3].forEach((file) => {
        fs.writeFileSync(file, '');
      });

      // expect true after new files and directories are created
      checkExists(true);
    });

    it('should create directories', () => {
      const dirName = 'new-dir';

      function checkExists(value: boolean): void {
        [
          joinTestPath(dirName),
          joinTestPath('dir1', dirName),
          joinTestPath('dir2', 'dir1', dirName),
        ].forEach((dir) => {
          expect(fs.existsSync(dir)).toBe(value);
        });
      }

      // expect false before directories are created
      checkExists(false);

      // create directories
      result.$dirCreate(dirName);
      result.dir1.$dirCreate(dirName);
      result.dir2.dir1.$dirCreate(dirName);

      // expect true after directories are created
      checkExists(true);
    });

    it('should return directory operations object from dirCreate', () => {
      const dirName = 'new-dir';

      const dir1 = result.$dirCreate(dirName);
      const dir2 = result.dir1.$dirCreate(dirName);
      const dir3 = result.dir2.dir1.$dirCreate(dirName);

      [dir1, dir2, dir3].forEach((dir) => {
        expect(dir).toBeDefined();
        expect(dir).toBeTypeOf('object');

        dirOperationMethods.forEach((method) => {
          expect(dir).toHaveProperty(method);
          expect(dir[method]).toBeInstanceOf(Function);
        });
      });
    });

    it('should delete directories from the file tree', () => {
      const dirs = [
        joinTestPath('dir1'),
        joinTestPath('dir2'),
        joinTestPath('dir2', 'dir1'),
        joinTestPath('dir2', 'dir2'),
      ];

      function checkExists(value: boolean): void {
        dirs.forEach((dir) => {
          expect(fs.existsSync(dir)).toBe(value);
        });
      }

      // create directories manually to mock FileManager's create method
      dirs.forEach((dir) => {
        fs.mkdirSync(dir, { recursive: true });
      });

      // expect true before deleting directories
      checkExists(true);

      // delete directories
      result.$dirDelete('dir1');
      result.$dirDelete('dir2');
      result.dir2.$dirDelete('dir1');
      result.dir2.$dirDelete('dir2');

      // expect false after deleting directories
      checkExists(false);
    });

    it('should delete directories not from the file tree', () => {
      const dirName = 'new-dir';
      const dirs = [
        joinTestPath(dirName),
        joinTestPath('dir2', dirName),
        joinTestPath('dir2', 'dir2', dirName),
      ];

      function checkExists(value: boolean): void {
        dirs.forEach((dir) => {
          expect(fs.existsSync(dir)).toBe(value);
        });
      }

      // create directories manually to mock FileManager's create method
      dirs.forEach((dir) => {
        fs.mkdirSync(dir, { recursive: true });
      });

      // expect true before deleting directories
      checkExists(true);

      // delete directories
      result.$dirDelete(dirName);
      result.dir2.$dirDelete(dirName);
      result.dir2.dir2.$dirDelete(dirName);

      // expect false after deleting directories
      checkExists(false);
    });

    it('should read files from the file tree', () => {
      function getFileData({ data }: FileInterface): string {
        return data instanceof Function ? data() : (data ?? '');
      }

      type File = { path: string; data: string };
      const file1: File = {
        path: joinTestPath('file1'),
        data: getFileData(tree.file1),
      };
      const file2: File = {
        path: joinTestPath('file2'),
        data: getFileData(tree.file2),
      };
      const file3: File = {
        path: joinTestPath('dir2', 'file1'),
        data: getFileData(tree.dir2.children.file1),
      };
      const file4: File = {
        path: joinTestPath('dir2', 'file2'),
        data: getFileData(tree.dir2.children.file2),
      };
      const file5: File = {
        path: joinTestPath('dir2', 'dir2', 'file1'),
        data: getFileData(tree.dir2.children.dir2.children.file1),
      };
      const file6: File = {
        path: joinTestPath('dir2', 'dir2', 'file2'),
        data: getFileData(tree.dir2.children.dir2.children.file2),
      };

      // create files manually to mock FileManager's create method
      fs.mkdirSync(joinTestPath('dir2', 'dir2'), { recursive: true });
      [file1, file2, file3, file4, file5, file6].forEach((file) => {
        fs.writeFileSync(file.path, file.data);
      });

      // read files
      expect(result.$fileRead('file1')).toBe(file1.data);
      expect(result.$fileRead('file2')).toBe(file2.data);
      expect(result.dir2.$fileRead('file1')).toBe(file3.data);
      expect(result.dir2.$fileRead('file2')).toBe(file4.data);
      expect(result.dir2.dir2.$fileRead('file1')).toBe(file5.data);
      expect(result.dir2.dir2.$fileRead('file2')).toBe(file6.data);
    });

    it('should read files that are not from the file tree', () => {
      type File = { path: string; data: string };
      const fileName = 'new-file';

      const file1: File = {
        path: joinTestPath(fileName),
        data: 'New File test',
      };
      const file2: File = {
        path: joinTestPath('dir1', fileName),
        data: 'Dir 1\nNew File test',
      };
      const file3: File = {
        path: joinTestPath('dir2', 'dir1', fileName),
        data: 'Dir 2\nDir 1\nNew File test',
      };

      // create files manually
      fs.mkdirSync(joinTestPath('dir1'));
      fs.mkdirSync(joinTestPath('dir2', 'dir1'), { recursive: true });
      [file1, file2, file3].forEach((file) => {
        fs.writeFileSync(file.path, file.data);
      });

      // read files
      expect(result.$fileRead(fileName)).toBe(file1.data);
      expect(result.dir1.$fileRead(fileName)).toBe(file2.data);
      expect(result.dir2.dir1.$fileRead(fileName)).toBe(file3.data);
    });

    it('should read files created with the fileCreate method', () => {
      const fileName = 'new-file';
      const fileData1 = 'New File test';
      const fileData2 = 'Dir 1\nNew File test';
      const fileData3 = 'Dir 2\nDir 1\nNew File test';

      fs.mkdirSync(joinTestPath('dir1'));
      fs.mkdirSync(joinTestPath('dir2', 'dir1'), { recursive: true });

      // create files using fileCreate
      result.$fileCreate(fileName, fileData1);
      result.dir1.$fileCreate(fileName, fileData2);
      result.dir2.dir1.$fileCreate(fileName, fileData3);

      // read files
      expect(result.$fileRead(fileName)).toBe(fileData1);
      expect(result.dir1.$fileRead(fileName)).toBe(fileData2);
      expect(result.dir2.dir1.$fileRead(fileName)).toBe(fileData3);
    });

    it('should read files created with the dirCreate and fileCreate methods', () => {
      const dirName = 'new-dir';
      const fileName = 'new-file';
      const fileData1 = 'New Dir\nNew File test';
      const fileData2 = 'Dir 1\nNew Dir\nNew File test';
      const fileData3 = 'Dir 2\nDir 1\nNew Dir\nNew File test';

      // create directories using dirCreate
      const dir1 = result.$dirCreate(dirName);
      const dir2 = result.dir1.$dirCreate(dirName);
      const dir3 = result.dir2.dir1.$dirCreate(dirName);

      // create files using fileCreate on created directories
      dir1.$fileCreate(fileName, fileData1);
      dir2.$fileCreate(fileName, fileData2);
      dir3.$fileCreate(fileName, fileData3);

      // read files
      expect(dir1.$fileRead(fileName)).toBe(fileData1);
      expect(dir2.$fileRead(fileName)).toBe(fileData2);
      expect(dir3.$fileRead(fileName)).toBe(fileData3);
    });

    it('should create files', () => {
      const fileName = 'new-file';

      function checkExists(value: boolean): void {
        [
          joinTestPath(fileName),
          joinTestPath('dir1', fileName),
          joinTestPath('dir2', 'dir1', fileName),
        ].forEach((file) => {
          expect(fs.existsSync(file)).toBe(value);
        });
      }

      fs.mkdirSync(joinTestPath('dir1'));
      fs.mkdirSync(joinTestPath('dir2', 'dir1'), { recursive: true });

      // expect false before files are created
      checkExists(false);

      // create files
      result.$fileCreate(fileName);
      result.dir1.$fileCreate(fileName);
      result.dir2.dir1.$fileCreate(fileName);

      // expect true after files are created
      checkExists(true);
    });

    it('should create a nested file in an existing folder', () => {
      const nestedFileName = 'dir2/dir1/new-file-2';
      const nestedFilePath = joinTestPath(nestedFileName);
      function checkExists(value: boolean): void {
        expect(fs.existsSync(nestedFilePath)).toBe(value);
      }

      checkExists(false);
      fs.mkdirSync(joinTestPath('dir2', 'dir1'), { recursive: true });
      result.$fileCreate(nestedFileName);
      checkExists(true);
    });

    it('should fail creating a nested file in a non-existing folder', () => {
      expect(() => result.$fileCreate('new-dir/new-file')).toThrow();
    });

    it('should return file operations object from fileCreate', () => {
      const fileName = 'new-file';
      fs.mkdirSync(joinTestPath('dir1'));
      fs.mkdirSync(joinTestPath('dir2', 'dir1'), { recursive: true });

      const file1 = result.$fileCreate(fileName);
      const file2 = result.dir1.$fileCreate(fileName);
      const file3 = result.dir2.dir1.$fileCreate(fileName);

      [file1, file2, file3].forEach((file) => {
        expect(file).toBeDefined();
        expect(file).toBeTypeOf('object');

        fileOperationMethods.forEach((method) => {
          expect(file).toHaveProperty(method);
          expect(file[method]).toBeInstanceOf(Function);
        });
      });
    });

    it('should delete files from the file tree', () => {
      const files = {
        file1: joinTestPath('file1'),
        file2: joinTestPath('file2'),
        file3: joinTestPath('dir2', 'file1'),
        file4: joinTestPath('dir2', 'file2'),
        file5: joinTestPath('dir2', 'dir2', 'file1'),
        file6: joinTestPath('dir2', 'dir2', 'file2'),
      };
      const { length } = Object.keys(files);

      function getFileProp(i: number): keyof typeof files {
        return `file${i + 1}` as keyof typeof files;
      }

      function checkExists(value: boolean): void {
        Array.from({ length }).map((_, i) => {
          expect(fs.existsSync(files[getFileProp(i)])).toBe(value);
        });
      }

      fs.mkdirSync(joinTestPath('dir2', 'dir2'), { recursive: true });
      Array.from({ length }).map((_, i) => {
        fs.writeFileSync(files[getFileProp(i)], '');
      });

      checkExists(true);

      result.$fileDelete('file1');
      result.$fileDelete('file2');
      result.dir2.$fileDelete('file1');
      result.dir2.$fileDelete('file2');
      result.dir2.dir2.$fileDelete('file1');
      result.dir2.dir2.$fileDelete('file2');

      checkExists(false);
    });

    it('should delete files not from the file tree', () => {
      const fileName = 'new-file';
      const files = {
        file1: joinTestPath(fileName),
        file2: joinTestPath('dir1', fileName),
        file3: joinTestPath('dir2', 'dir1', fileName),
      };
      const { length } = Object.keys(files);

      function getFileProp(i: number): keyof typeof files {
        return `file${i + 1}` as keyof typeof files;
      }

      function checkExists(value: boolean): void {
        Array.from({ length }).map((_, i) => {
          expect(fs.existsSync(files[getFileProp(i)])).toBe(value);
        });
      }

      fs.mkdirSync(joinTestPath('dir1'));
      fs.mkdirSync(joinTestPath('dir2', 'dir1'), { recursive: true });
      Array.from({ length }).map((_, i) => {
        fs.writeFileSync(files[getFileProp(i)], '');
      });

      checkExists(true);

      result.$fileDelete(fileName);
      result.dir1.$fileDelete(fileName);
      result.dir2.dir1.$fileDelete(fileName);

      checkExists(false);
    });

    it('should write to a file', () => {
      const file1 = path.join(testDirPath, 'file1');
      fs.writeFileSync(file1, '');
      expect(fs.readFileSync(file1, { encoding: 'utf-8' })).toBe('');
      const fileData = 'Hello, World!';
      result.$fileWrite('file1', fileData);
      expect(fs.readFileSync(file1, { encoding: 'utf-8' })).toBe(fileData);
    });

    it('should clear the file data', () => {
      const file1 = path.join(testDirPath, 'file1');
      const fileData = 'Hello, World!';
      fs.writeFileSync(file1, fileData);
      expect(fs.readFileSync(file1, { encoding: 'utf-8' })).toBe(fileData);
      result.$fileClear('file1');
      expect(fs.readFileSync(file1, { encoding: 'utf-8' })).toBe('');
    });
  });

  describe('buildOperationTree - custom file operations', () => {
    const testDirPath = joinPath('custom-operations');

    const getFileOperations = buildFileOperations((file) => ({
      getFilePath(): string {
        return file.path;
      },
      getFileData(): string | undefined {
        return file.data instanceof Function ? file.data() : file.data;
      },
      getFileType(): 'file' {
        return file.type;
      },
      getFileSkip(): boolean | undefined {
        return file.skip;
      },
      plusOne(value: number): number {
        return value + 1;
      },
    }));

    type CustomFileOperations = ReturnType<typeof getFileOperations>;

    const customFileMethods: (keyof CustomFileOperations)[] = [
      'getFileData',
      'getFilePath',
      'getFileSkip',
      'getFileType',
      'plusOne',
    ];

    let result: FileOperationTreeType<Tree, CustomFileOperations>;

    beforeEach(() => {
      fs.mkdirSync(testDirPath, { recursive: true });
      result = buildOperationTree(testDirPath, tree, {
        file: getFileOperations,
      });
    });

    afterEach(() => {
      fs.rmSync(testDirPath, {
        force: true,
        recursive: true,
      });
    });

    it('should have correct custom file operation methods', () => {
      [
        result.file1,
        result.file2,
        result.dir2.file1,
        result.dir2.file2,
      ].forEach((file) => {
        customFileMethods.forEach((method) => {
          expect(file).toHaveProperty(method);
          expect(file[method]).toBeInstanceOf(Function);
        });
      });
    });

    it('should create a file with custom file operations', () => {
      // create directories manually
      fs.mkdirSync(path.join(testDirPath, 'dir1'));
      fs.mkdirSync(path.join(testDirPath, 'dir2', 'dir1'), { recursive: true });

      const file1 = result.$fileCreate('new-file');
      const file2 = result.dir1.$fileCreate('new-file');
      const file3 = result.dir2.dir1.$fileCreate('new-file');

      [file1, file2, file3].forEach((file) => {
        customFileMethods.forEach((method) => {
          expect(file).toHaveProperty(method);
          expect(file[method]).toBeInstanceOf(Function);
        });
      });
    });

    it('should return file path', () => {
      // create directories manually
      const dir1 = path.join(testDirPath, 'dir1');
      const dir2 = path.join(testDirPath, 'dir2', 'dir1');
      fs.mkdirSync(dir1);
      fs.mkdirSync(dir2, { recursive: true });

      const file1 = result.$fileCreate('new-file');
      const file2 = result.dir1.$fileCreate('new-file');
      const file3 = result.dir2.dir1.$fileCreate('new-file');

      expect(file1.getFilePath()).toBe(path.join(testDirPath, 'new-file'));
      expect(file2.getFilePath()).toBe(path.join(dir1, 'new-file'));
      expect(file3.getFilePath()).toBe(path.join(dir2, 'new-file'));
    });

    it('should return file data', () => {
      //
    });

    it('should return file type', () => {
      //
    });

    it('should return skip value', () => {
      //
    });

    it('should add 1', () => {
      //
    });
  });

  describe('buildOperationTree - custom directory operations', () => {
    const testDirPath = joinPath('custom-operations');

    const getDirOperations = buildDirOperations((dir) => ({
      getDirPath(): string {
        return dir.path;
      },
      getDirType(): 'dir' {
        return dir.type;
      },
      getDirChildren(): string[] {
        return Object.keys(dir.children ?? {});
      },
      plusOne(value: number): number {
        return value + 1;
      },
    }));

    type CustomDirOperations = ReturnType<typeof getDirOperations>;

    const customDirMethods: (keyof CustomDirOperations)[] = [
      'getDirPath',
      'getDirType',
      'getDirChildren',
      'plusOne',
    ];

    let result: FileOperationTreeType<Tree, undefined, CustomDirOperations>;

    beforeEach(() => {
      fs.mkdirSync(testDirPath, { recursive: true });
      result = buildOperationTree(testDirPath, tree, {
        dir: getDirOperations,
      });
    });

    afterEach(() => {
      fs.rmSync(testDirPath, {
        force: true,
        recursive: true,
      });
    });

    it('should have correct custom directory operation methods', () => {
      [
        result,
        result.dir1,
        result.dir2,
        result.dir2.dir1,
        result.dir2.dir2,
      ].forEach((directory) => {
        customDirMethods.forEach((method) => {
          expect(directory).toHaveProperty(method);
          expect(directory[method]).toBeInstanceOf(Function);
        });
      });
    });

    it('should create a directory with custom directory operations', () => {
      // TODO: create multiple nested directories to test
      const dir = result.$dirCreate('new-dir');

      customDirMethods.forEach((method) => {
        expect(dir).toHaveProperty(method);
        expect(dir[method]).toBeInstanceOf(Function);
      });
    });
  });
});
