import {initializeApp} from 'firebase/app';
import {getAuth,onIdTokenChanged,setPersistence,browserLocalPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,signOut,updateProfile} from 'firebase/auth';
export async function setupFirebase(config,onChange){
 const auth=getAuth(initializeApp(config));await setPersistence(auth,browserLocalPersistence);await getRedirectResult(auth).catch(()=>{});
 const sync=async user=>{if(!user){await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{});onChange({signedIn:false});return;}if(!user.emailVerified){onChange({signedIn:true,verified:false,email:user.email});return;}const token=await user.getIdToken();const response=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}'});if(!response.ok)throw Error('Oturum doğrulanamadı. Lütfen yeniden giriş yapın.');onChange({signedIn:true,verified:true,email:user.email});};
 onIdTokenChanged(auth,user=>sync(user).catch(error=>onChange({error:error.message})));
 return {
  async headers(){const user=auth.currentUser;return user?.emailVerified?{Authorization:'Bearer '+await user.getIdToken()}:{};},
  async register(email,password,name){if(password.length<12)throw Error('En az 12 karakterlik bir şifre seçin.');const result=await createUserWithEmailAndPassword(auth,email,password);if(name)await updateProfile(result.user,{displayName:name.slice(0,100)});await sendEmailVerification(result.user,{url:location.origin+'/login'});return result.user;},
  login:(email,password)=>signInWithEmailAndPassword(auth,email,password),
  async google(){const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await signInWithPopup(auth,provider);}catch(error){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error.code))await signInWithRedirect(auth,provider);else throw error;}},
  reset:email=>sendPasswordResetEmail(auth,email,{url:location.origin+'/login'}),
  resend:()=>auth.currentUser&&sendEmailVerification(auth.currentUser,{url:location.origin+'/login'}),
  async verify(){await auth.currentUser?.reload();if(auth.currentUser?.emailVerified){await auth.currentUser.getIdToken(true);await sync(auth.currentUser);}else throw Error('E-posta henüz doğrulanmamış. Gelen kutunuzu ve spam klasörünü kontrol edin.');},
  logout:()=>signOut(auth)
 };
}
