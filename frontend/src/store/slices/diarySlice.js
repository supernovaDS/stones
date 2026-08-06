import { db, setActiveDiaryKey } from "../../db/schema";
import { supabase } from "../../lib/supabaseClient";
import { deriveHash, deriveKey, decryptString, decryptObject, isEncryptedObject, isEncryptedString, getDeterministicSalt } from "../../utils/crypto";
import { legacyHashPassword } from "../../utils/helpers";
import {
  createId,
  decryptDiaryData,
  enqueueMutation,
  getUniquePageTitle,
  nowIso,
  pushUndoSnapshot
} from "../storeHelpers";

export const createDiarySlice = (set, get) => ({
  diaryPasswordHash: null,
  diaryKey: null,
  diaryAuthenticated: false,
  activeDiaryPageId: null,

  setDiaryPassword: async (password) => {
    let userId = "local";
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) userId = session.user.id;
    }
    
    const salt = getDeterministicSalt(userId);
    const hash = await deriveHash(password, salt);
    const key = await deriveKey(password, salt);
    
    await db.settings.put({ key: "diaryPasswordHash", value: hash });
    await db.settings.put({ key: "diarySalt", value: salt });
    
    setActiveDiaryKey(key);

    const diaryPages = await db.pages.filter(p => p.workspaceId === "diary").toArray();
    for (const p of diaryPages) {
       await db.pages.put(p);
    }
    const diaryPageIds = new Set(diaryPages.map(p => p.id));
    const diaryBlocks = await db.blocks.filter(b => diaryPageIds.has(b.pageId)).toArray();
    for (const b of diaryBlocks) {
       await db.blocks.put(b);
    }

    set({ diaryPasswordHash: hash, diaryKey: key, diaryAuthenticated: true });
  },

  authenticateDiary: async (password) => {
    const { diaryPasswordHash, pages, blocks } = get();
    
    let isMatch = false;
    let salt = null;

    let userId = "local";
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) userId = session.user.id;
    }
    const defaultSalt = getDeterministicSalt(userId);

    let saltRecord = await db.settings.get("diarySalt");
    salt = saltRecord?.value || defaultSalt;

    const hash = await deriveHash(password, salt);
    const legacyHash = await legacyHashPassword(password);

    if (diaryPasswordHash) {
      if (hash === diaryPasswordHash) {
        isMatch = true;
      } else if (legacyHash === diaryPasswordHash) {
        isMatch = true;
        await db.settings.put({ key: "diaryPasswordHash", value: hash });
        await db.settings.put({ key: "diarySalt", value: salt });
        set({ diaryPasswordHash: hash });
      }
    } else {
      const diaryPages = pages.filter(p => p.workspaceId === "diary");
      if (diaryPages.length > 0) {
        const testKey = await deriveKey(password, salt);
        const encryptedPage = diaryPages.find(p => isEncryptedString(p.title));
        const encryptedBlock = blocks.find(b => {
          const p = pages.find(page => page.id === b.pageId);
          return p?.workspaceId === "diary" && isEncryptedObject(b.content);
        });

        if (encryptedPage || encryptedBlock) {
          try {
            if (encryptedPage) {
              await decryptString(encryptedPage.title, testKey);
            } else {
              await decryptObject(encryptedBlock.content, testKey);
            }
            isMatch = true;
            await db.settings.put({ key: "diaryPasswordHash", value: hash });
            await db.settings.put({ key: "diarySalt", value: salt });
            set({ diaryPasswordHash: hash });
          } catch (e) {
            isMatch = false;
          }
        } else {
          isMatch = false;
        }
      }
    }

    if (isMatch && salt) {
      const key = await deriveKey(password, salt);
      setActiveDiaryKey(key);
      
      const { pages: newPages, blocks: newBlocks } = await decryptDiaryData(pages, blocks, key);
      
      set({ diaryAuthenticated: true, diaryKey: key, pages: newPages, blocks: newBlocks });
      return true;
    }
    return false;
  },

  setActiveDiaryPage: (pageId) => set({ activeDiaryPageId: pageId }),

  addDiaryPage: async (title) => {
    pushUndoSnapshot(get, set, "create diary page");
    const createdAt = nowIso();
    const uniqueTitle = getUniquePageTitle(title, get().pages);
    const page = {
      id: createId("page"),
      workspaceId: "diary",
      sectionId: null,
      title: uniqueTitle,
      createdAt,
      updatedAt: createdAt
    };

    await db.pages.add(page);
    await enqueueMutation("page", page.id, "upsert", page);
    set((state) => ({
      pages: [...state.pages, page],
      activeDiaryPageId: page.id
    }));
    get().setNotification(`Diary page "${title}" created`);
  }
});
