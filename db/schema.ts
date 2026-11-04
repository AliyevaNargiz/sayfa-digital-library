import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const books=sqliteTable('books',{id:text('id').primaryKey(),data:text('data').notNull(),createdAt:text('created_at').notNull()});
export const loginAttempts=sqliteTable('login_attempts',{ip:text('ip').primaryKey(),attempts:integer('attempts').notNull().default(0),windowStart:integer('window_start').notNull()});
export const libraryImports=sqliteTable('library_imports',{id:text('id').primaryKey(),completedAt:text('completed_at').notNull()});
export const digitalFiles=sqliteTable('digital_files',{
 id:text('id').primaryKey(),bookId:text('book_id').notNull(),objectKey:text('object_key').notNull(),
 fileName:text('file_name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),
 hash:text('hash').notNull().unique(),coverKey:text('cover_key'),uploadedAt:text('uploaded_at').notNull()
});

export const categories=sqliteTable('categories',{id:text('id').primaryKey(),name:text('name').notNull(),normalized:text('normalized').notNull().unique()});
