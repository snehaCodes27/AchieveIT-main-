import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

raw_student_data = """Div	Student ID	Name of Student	NEW MAIL CREATED
A	2023FHIT012	AINKAR KARAN MAHENDRA (MONIKA)	ainkar.karan.it012@gmail.com
A	2023FHIT049	AJANYA RAMACHANDRAN (DHANISHA)	ajanya.ramachandran.it049@gmail.com
A	2023FHIT024	BAVKAR HETAL VISHWAS (SAKSHI)	bavkar.hetal.it024@gmail.com
A	2023FHIT041	BELWATKAR SAMRUDDHI SANTOSH (SUNITA)	belwatkar.samruddhi.it041@gmail.com
A	2023FHIT035	BHADRE SUMIT SUBHASH (MAHANANDA)	bhadre.sumit.it035@gmail.com
A	2024DSIT021	BHALEKAR RIYA RAVINDRA (SUNITA)	bhalekar.riya.it021@gmail.com
A	2023FHIT058	BHALEKAR SMRITI SANTOSH (SUREKHA)	bhalekar.smriti.it058@gmail.com
A	2023FHIT067	BHALERAO KRISH RAVINDRA (BHAGYASHRI)	bhalerao.krish.it067@gmail.com
A	2023FHIT105	BHANDARE PRANAY TANAJI (SUJATA)	bhandare.pranay.it131@gmail.com
A	2024DSIT003	BHATIA GOURAV VINOD (JYOTI)	bhatia.gourav.it003@gmail.com
A	2023FHIT020	BHAVSAR NISARG CHANDRASHEKHAR (BHARATI)	bhavsar.nisarg.it020@gmail.com
A	2023FHIT060	BHAYARE ARYAN AMRISH (DHANSHRI)	bhayare.aryan.it060@gmail.com
A	2023FHIT080	BHOBASKAR SUJAL PRAMOD (SUNAYNA)	bhobaskar.sujal.it080@gmail.com
A	2023FHIT005	BHOJANE PRANAV DEEPAK (SAKSHI)	bhojane.pranav.it005@gmail.com
A	2024DSIT023	BHOSALE MAYURI VILAS (VANDANA)	bhosale.mayuri.it023@gmail.com
A	2023FHIT006	BHOYE SANIKA SHRAVAN (SANJANA)	bhoye.sanika.it006@gmail.com
A	2023FHIT044	BODEKAR ADITI SHAM (MEENA)	bodekar.aditi.it044@gmail.com
A	2023FHIT009	BORGE RAJ RAVINDRA (VIJAYA)	borge.raj.it009@gmail.com
A	2024DSIT010	BORHADE NIKITA POPAT (TANUJA)	borhade.nikita.it010@gmail.com
A	2023FHIT046	BOROLE MOHIT DATTATRAY (HARSHALA)	borole.mohit.it046@gmail.com
A	2023FHIT034	CHANGAN SHRUTI ARVIND (SANGITA)	changan.shruti.it034@gmail.com
A	2023FHIT021	CHAUDHARI PRATHMESH DATTATRAY (SUJATA)	chaudhari.prathmesh.it021@gmail.com
A	2023FHIT014	CHAUHAN NIKHIL BUDHPAL (ANITA)	chauhan.nikhil.it014@gmail.com
A	2023FHIT113	CHAVAN ARYAN RATANSING  (KAVITA)	chavan.aryan.it113@gmail.com
A	2024DSIT013	CHAVAN DIVYA JAYWANT (AKSHATA)	chavan.divya.it013@gmail.com
A	2024DSIT018	CHAVAN PRATHAMESH NARAYAN (SARIKA)	chavan.prathamesh.it018@gmail.com
A	2024DSIT017	CHAVAN TANMAY SUNIL (SAVITA)	chavan.tanmay.it017@gmail.com
A	2023FHIT043	DAGADE SWAPNIL SANJAY DAGADE (CHHAYA)	dagade.swapnil.it043@gmail.com
A	2023FHIT001	DANDEKAR MAYURESH GANESH (SUVARNA)	dandekar.mayuresh.it001@gmail.com
A	2023FHIT077	DESHMUKH PRATHAM PAVAN (PRANALI)	deshmukh.pratham.it077@gmail.com
A	2023FHIT019	DHAVALE ANIKET VASANT (SUMAN)	dhavale.aniket.it019@gmail.com
A	2023FHIT052	DOIPHODE SHEJAL SANTOSHKUMAR (ARCHANA)	doiphode.shejal.it052@gmail.com
A	2023FHIT114	DONGRE ADITYA VIKRAM(RENUKA)	dongre.aditya.it114@gmail.com
A	2023FHIT042	DUBEY SHLOK BALKRISHNA  (ANJU)	dubey.shlok.it042@gmail.com
A	2024DSIT022	GADADE ATISH DAYANAND (PADMAJA)	gadade.atish.it022@gmail.com
A	2023FHIT121	GAIKWAD ADWAIT SUSHIL (ARPANA)	gaikwad.adwait.it121@gmail.com
A	2023FHIT037	GAIKWAD ROHIT NETAJI  (JYOTI)	gaikwad.rohit.it037@gmail.com
A	2024DSIT027	GHAWTE ANFAL MOHAMED NADEEM (SUFIYANA)	ghawte.anfal.it027@gmail.com
A	2024DSIT020	GOPHANE KARAN SANTOSH (SHOBHA)	gophane.karan.it020@gmail.com
A	2024DSIT006	GUPTA SHRUTI DEEPAK (BARKHA)	gupta.shruti.it006@gmail.com
A	2023FHIT094	GUPTA SURAJ SUNIL (GAYATRI)	gupta.suraj.it094@gmail.com
A	2023FHIT115	INGOLE ISHAN S (KANCHAN)	ingole.ishan.it115@gmail.com
A	2023FHIT078	JADHAV ADITYA MAHADU (MEERA)	jadhav.aditya.it078@gmail.com
A	2024DSIT011	JADHAV PRAGATI DATTA  (VANDANA)	jadhav.pragati.it011@gmail.com
A	2023FHIT101	JADHAV RUTUJA BHARAT (KAVITA)	jadhav.rutuja.it101@gmail.com
A	2023FHIT081	JADHAV TUSHAR SANJAY (SAVITA)	jadhav.tushar.it081@gmail.com
A	2023FHIT076	JAGDALE GAURAV ASHOK (ROHINI)	jagdale.gaurav.it076@gmail.com
A	2023FHIT103	JAMKHANDI VAISHNAVI CHANDRASHEKHAR (MINAKSHI)	jamkhandi.vaishnavi.it103@gmail.com
A	2023FHIT106	JANGALE SIDDHESH RAJESH (SANGITA)	jangale.siddhesh.it106@gmail.com
A	2023FHIT050	JOGDAND YASH ANIL  (BHARTI)	jogdand.yash.it050@gmail.com
A	2023FHIT069	JOGMARGE ISHA DIGMBAR (DIPTI)	jogmarge.isha.it069@gmail.com
A	2023FHIT017	JOSHI ASHWIN HIMALAY (SHUBHANGI)	joshi.ashwin.it017@gmail.com
A	2023FHIT023	KADAM DHRUV SUNIL (SIDDHI)	kadam.dhruv.it023@gmail.com
A	2023FHIT028	KADAM PRACHI PRAMOD (SANGEETA)	kadam.prachi.it028@gmail.com
A	2023FHIT089	KADAM SANKET ANANDRAO (VANITA)	kadam.sanket.it089@gmail.com
A	2023FHIT065	KAJALE JANHAVI SANGHAPAL (SUREKHA)	kajale.janhavi.it065@gmail.com
A	2023FHIT022	KALE GAURAV BHAIRAVNATH (ULPA)	kale.gaurav.it022@gmail.com
A	2023FHIT036	KAPARE AKASH SURESH (SUREKHA)	kapare.akash.it036@gmail.com
A	2023FHIT025	KAPRI BHAVANA HARISH (JANKI)	kapri.bhavana.it025@gmail.com
A	2024DSIT009	KAWATE OM KAILASH (MEENAKSHI)	kawate.om.it009@gmail.com
A	2024DSIT007	KAZI ADNAN VASIM (NASIM)	kazi.adnan.it007@gmail.com
A	2023FHIT083	LAVHATE ASHITOSH ASHOK (SAVITA)	lavhate.ashitosh.it083@gmail.com
A	2024DSIT026	LOHOTE SOHAM SUNIL (MAYURI)	lohote.soham.it026@gmail.com
A	2023FHIT095	MAHAJAN GAURAV RAMESH (RESHMA)	mahajan.gaurav.it095@gmail.com
A	2023FHIT110	MALANDKAR AYUSH DINESH  (SUVARNA)	malandkar.ayush.it110@gmail.com
A	2023FHIT130	MANMADKAR AAYUSH RAMESH (KIRAN)	manmadkar.aayush.it130@gmail.com
A	2024DSIT012	MATKAR SNEHA SHAMKANT (SUREKHA)	matkar.sneha.it012@gmail.com
A	2023FHIT013	MAURYA KARTIK JAYPRAKASH (MAMTA)	maurya.kartik.it013@gmail.com
A	2023FHIT031	MAURYA PRIYANSHI LALBIHARI (LAXMI)	maurya.priyanshi.it031@gmail.com
B	2023FHIT119	MAYEKAR DHARNI SANDEEP (PURVA)	mayekar.dharni.it119@gmail.com
B	2023FHIT120	MAYEKAR OM MAHENDRA (MANASI)	mayekar.om.it120@gmail.com
B	2024DSIT019	MAYEKAR VIDISHA VISHWAS (VIDULA)	mayekar.vidisha.it019@gmail.com
B	2023FHIT047	MHASKE ADWAIT BALIRAM (PRAJAKTA)	mhaske.adwait.it047@gmail.com
B	2023FHIT126	MISHRA VED VIDYABHUSHAN (SUNITA)	mishra.ved.it126@gmail.com
B	2024DSIT029	MOHITE PRATIKSHA ARUN (SARIKA)	mohite.pratiksha.it029@gmail.com
B	2024DSIT015	MONDE NIDHI DATTARAM (MAMTA)	monde.nidhi.it015@gmail.com
B	2024DSIT016	MORE ARYA LAXMAN (RANJANA)	more.arya.it016@gmail.com
B	2024DSIT004	MORE DIKSHA UDAY (YOGITA)	more.diksha.it004@gmail.com
B	2023FHIT124	MORE MANOJ BABAJI (LALITA)	more.manoj.it124@gmail.com
B	2023FHIT072	MUDLIYAR SHRINIVAS RAMALINGAM (SHARADA)	mudliyar.shrinivas.it072@gmail.com
B	2023FHIT064	MUKRI AFFAN ASIF (FARZANA)	mukri.affan.it064@gmail.com
B	2023FHIT055	NAGVEKAR TANVI UDAY (SHIVANI)	nagvekar.tanvi.it055@gmail.com
B	2023FHIT088	NAIK PARAG ASHOK (SUVARNA)	naik.parag.it088@gmail.com
B	2023FHIT002	NAIK YASHASHREE HEMANT (HEENA)	naik.yashashree.it002@gmail.com
B	2023FHIT011	NALAWADE SHRIRAM POPAT (VAISHALI)	nalawade.shriram.it011@gmail.com
B	2024DSIT024	NANDEKAR SIDDHARTH PRAMOD (SHITAL)	nandekar.siddharth.it024@gmail.com
B	2024DSIT002	NANDWALKAR AKSHATA AVINASH (NILIMA)	nandwalkar.akshata.it002@gmail.com
B	2023FHIT092	NARUTE HARSHADA VITTHAL (ARCHANA)	narute.harshada.it092@gmail.com
B	2022FHIT027	NILE CHINMAY RAJESH (REKHA)	nile.chinmay.it027@gmail.com
B	2024DSIT030	NIWATE SOHAM SWAPNIL (CHAITALI)	niwate.soham.it030@gmail.com
B	2024DSIT014	PANDA DIYA HARIHAR (PRATIMA)	panda.diya.it014@gmail.com
B	2023FHIT123	PANDIT PREMKUMAR RAMPREET (POONAM)	pandit.premkumar.it123@gmail.com
B	2023FHIT004	PANSARE GAURAV DADABA (SANGEETA)	pansare.gaurav.it004@gmail.com
B	2023FHIT027	PATIL HEMANT VILAS (VARSHA)	patil.hemant.it027@gmail.com
B	2023FHIT059	PATIL HINDAVI MANOJ (SEEMA)	patil.hindavi.it059@gmail.com
B	2023FHIT102	PATIL PAYAL RAJESH (MINAKSHI)	patil.payal.it102@gmail.com
B	2023FHIT039	PATIL PIYUSH SANJAY (KARTIKI)	patil.piyush.it039@gmail.com
B	2024DSIT028	PATIL PRATHAMESH JAYAVANT (SUNITA)	patil.prathamesh.it028@gmail.com
B	2022FHIT109	PAWAR SANCHIT DEEPAK (PREMA)	pawar.sanchit.it109@gmail.com
B	2023FHIT063	PAWASKAR PRATIK KUMAR (GAURI)	pawaskar.pratik.it063@gmail.com
B	2023FHIT132	PHADALE SIDDHESH SUBHASH (VIJAYA)	phadale.siddhesh.it132@gmail.com
B	2023FHIT073	POONJA DAKSH NAGRAJ (SANDHYA)	poonja.daksh.it073@gmail.com
B	2023FHIT033	RANE SANDESH PRADIP (MANISHA)	rane.sandesh.it033@gmail.com
B	2023FHIT111	RATHOD SHREYAS MANSING (USHA)	rathod.shreyas.it111@gmail.com
B	2023FHIT100	RAWAT DHRITI  (CHAMPA RAWAT)	rawat.dhriti.it100@gmail.com
B	2023FHIT038	SALVE VAIBHAV PRAVIN (VAISHALI)	salve.vaibhav.it038@gmail.com
B	2024DSIT025	SATPUTE NIKITA  AMOD (RUPALI)	satpute.nikita.it025@gmail.com
B	2023FHIT045	SHELAR PIYUSH SANTOSH (ROHINI)	shelar.piyush.it045@gmail.com
B	2023FHIT109	SHINDE ANISH SUNIL (MADHURI)	shinde.anish.it109@gmail.com
B	2023FHIT090	SHINDE PRANAVI KISAN (SHARDA)	shinde.pranavi.it090@gmail.com
B	2023FHIT016	SHINDE ROHAN SANTOSH (NANDA)	shinde.rohan.it016@gmail.com
B	2023FHIT093	SHIROSE SHUBHAM KALURAM (SANDHYA)	shirose.shubham.it093@gmail.com
B	2023FHIT082	SONAR RUCHIRA RAVIRAJ (RUPALI)	sonar.ruchira.it082@gmail.com
B	2023FHIT127	SONJE MRUNALI CHANDRAKANT (NEETA SONJE)	sonje.mrunali.it127@gmail.com
B	2023FHIT084	SONKAR SHUBHAM DAYAL (REENA)	sonkar.shubham.it084@gmail.com
B	2023FHIT008	SURVE NIRAJ SANTOSH (SAMRUDDHI)	surve.niraj.it008@gmail.com
B	2024DSIT001	TALEKAR ADITI HARESH SAKSHI (SAKSHI)	talekar.aditi.it001@gmail.com
B	2024DSIT005	TAMBE AKANKSHA SANJAY (ASHA)	tambe.akanksha.it005@gmail.com
B	2023FHIT051	TAYDE RUSHIKESH SHYAM (SHAILA)	tayde.rushikesh.it051@gmail.com
B	2023FHIT086	THOOL ABHISHEK ATUL (VIDESHA)	thool.abhishek.it086@gmail.com
B	2023FHIT097	TUPE RUSHIPRASAD DASHARATH (SANGEETA)	tupe.rushiprasad.it097@gmail.com
B	2023FHIT070	VARKUTE SIDDHESH KISAN (KAVITA)	varkute.siddhesh.it070@gmail.com
B	2023FHIT018	VOLLALA NIKHIL GANGADHAR (SUNITA)	vollala.nikhil.it018@gmail.com
B	2023FHIT125	WORLIKAR ABHIJEET ATUL (SARITA)	worlikar.abhijeet.it125@gmail.com
B	2023FHIT096	YADAV ROSHINI  (INDRAVATI)	yadav.roshini.it096@gmail.com
B	2023FHIT007	YADAV YASH RAJESH (MALTI)	yadav.yash.it007@gmail.com
B	2023FHIT061	YEOLE PRIYANSHA BHUSHAN (HARSHADA)	yeole.priyansha.it061@gmail.com
B	2023FHIT010	YETKAR TANVESH GANESH (ASHA)	yetkar.tanvesh.it010@gmail.com
B	2023FHIT062	SAWANT MADHUR VISHWANATH (MANASI)	sawant.madhur.it062@gmail.com
B	2023FHIT118	SAWANT RIYA GANESH (SARIKA)	sawant.riya.it118@gmail.com
B	2023FHIT057	SAWANT VEDANT VINAYAK (SHILPAKALA)	sawant.vedant.it057@gmail.com
B	2023FHIT117	SHAHANE SHRUTIKA SANTOSH (SAVITA)	shahane.shrutika.it117@gmail.com
B	2023FHIT026	SHAIKH MOHAMMED SAIF MUNSHIR AHMED (SHABNAM)	shaikh.mohammed.it026@gmail.com
B	2022FHIT032	SHARMA ALOK JAIPRAKASH (DOLLY)	sharma.alok.it032@gmail.com
"""

def main():
    db = SessionLocal()
    lines = [l.strip() for l in raw_student_data.strip().split('\n') if l.strip()]
    header = lines[0]
    data_lines = lines[1:]

    imported_count = 0
    updated_count = 0

    for line in data_lines:
        parts = line.split('\t') if '\t' in line else line.split(',')
        if len(parts) >= 3:
            div = parts[0].strip()
            college_id = parts[1].strip()
            name = parts[2].strip()
            email = parts[3].strip() if len(parts) > 3 else f"{college_id.lower()}@college.edu"

            existing = db.query(User).filter(User.college_id == college_id).first()
            if not existing:
                new_user = User(
                    college_id=college_id,
                    name=name,
                    email=email,
                    role=UserRole.STUDENT,
                    department="Information Technology",
                    hashed_password=get_password_hash(college_id) # default password is their Student ID
                )
                db.add(new_user)
                imported_count += 1
            else:
                existing.name = name
                existing.email = email
                existing.role = UserRole.STUDENT
                updated_count += 1

    db.commit()
    db.close()
    print(f"\n==================================================")
    print(f" SUCCESS! Provisioned {imported_count} new BE students (and updated {updated_count}).")
    print(f" Default student password is set to their Student ID.")
    print(f" Example login: Student ID = 2024DSIT012 | Password = 2024DSIT012")
    print(f"==================================================\n")

if __name__ == "__main__":
    main()
