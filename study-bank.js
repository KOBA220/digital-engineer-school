// Original practice questions. These are not official examination questions.
export const studyCategories=[['itpass','strategy','ストラテジ'],['itpass','management','マネジメント'],['itpass','technology','テクノロジ'],['toeic','grammar','文法'],['toeic','vocabulary','語彙'],['toeic','reading','読解']];
const practiceSets={
 strategy:[
 ['SWOT分析で、企業の内部環境の強みを表すものは？',['Strength','Weakness','Opportunity','Threat'],0,'Strengthは強み、Weaknessは弱み。OpportunityとThreatは外部環境です。'],
 ['売上高から売上原価を差し引いた利益は？',['営業利益','売上総利益','経常利益','純利益'],1,'売上総利益（粗利益）＝売上高－売上原価です。'],
 ['企業間で商品やサービスを取引する形態は？',['BtoC','CtoC','BtoB','CtoB'],2,'BtoBはBusiness to Businessで、企業間取引を意味します。'],
 ['目標の達成度を測る重要業績評価指標は？',['KPI','RFP','CPU','LAN'],0,'KPIは重要業績評価指標です。施策の進捗や達成度を測ります。'],
 ['顧客との関係を管理し、満足度や継続取引を高める考え方は？',['CRM','CAD','DNS','OS'],0,'CRMはCustomer Relationship Management。顧客情報や接点を管理します。'],
 ['市場で売上数量を増やすために、製品・価格・流通・販促を考える枠組みは？',['3C','4P','PDCA','WBS'],1,'4PはProduct、Price、Place、Promotionです。'],
 ['業務の一部を外部の専門業者に委託することは？',['内製化','アウトソーシング','垂直統合','標準化'],1,'アウトソーシングは業務の外部委託です。'],
 ['デジタル技術を用いて業務やビジネスを変革することは？',['DX','HTML','FTP','DHCP'],0,'DXはデジタルトランスフォーメーション。技術導入だけでなく業務・事業の変革を含みます。'],
 ['在庫管理などで利用される、モノの個体を無線で識別する技術は？',['RFID','RAID','VPN','OSS'],0,'RFIDは無線通信によってタグの情報を読み取り、個体を識別します。'],
 ['店舗で販売した時点の情報を収集するシステムは？',['POS','ERP','MIME','BIOS'],0,'POSは販売時点情報管理。商品・数量・時刻などを記録します。'],
 ['変動費率が一定のとき、固定費が増えると損益分岐点売上高は？',['下がる','変わらない','上がる','常にゼロになる'],2,'損益分岐点売上高＝固定費÷（1－変動費率）。固定費の増加で上がります。'],
 ['著作物の利用について、原則として適切なのは？',['ネット公開なら自由に転載できる','出典を書けば全文転載できる','許諾や法令上の利用条件を確認する','商用でなければ何でも転載できる'],2,'公開されていても権利は失われません。許諾や引用などの条件を確認します。']
 ],
 management:[
 ['PDCAのCは何を行う段階？',['計画','実行','評価・確認','改善'],2,'Plan→Do→Check→Act。Checkは結果を評価・確認する段階です。'],
 ['プロジェクトの作業を階層的に分解する手法は？',['WBS','DNS','CRM','SQL'],0,'WBSはWork Breakdown Structure。作業を細かく分解して管理します。'],
 ['サービス提供者と利用者がサービス品質について合意するものは？',['SLA','CPU','FTP','CAD'],0,'SLAはサービスレベル合意。稼働率や応答時間などを定めます。'],
 ['システム開発を短い期間で繰り返し、変化に対応する方法は？',['アジャイル開発','一括変換','物理設計','定期棚卸し'],0,'アジャイル開発は短い反復で成果を確認し、要求の変化に対応します。'],
 ['障害によって停止したサービスを速やかに復旧する活動は？',['インシデント管理','構成管理','財務管理','在庫管理'],0,'インシデント管理では、通常のサービスを迅速に回復させます。'],
 ['テストで実際の出力を比較するため、事前に用意するものは？',['期待結果','秘密鍵','広告素材','請求書'],0,'期待結果と実際の結果を比較して動作を確認します。'],
 ['変更要求を評価し、承認した上で反映する目的は？',['影響やリスクを管理するため','履歴を消すため','テストを省くため','権限を不要にするため'],0,'変更の影響・費用・リスクを確認し、承認と記録を行います。'],
 ['ガントチャートが主に表すものは？',['作業の期間と進捗','ネットワークのIPアドレス','製品の原価だけ','暗号化の鍵'],0,'ガントチャートは作業を時間軸上の帯で示します。'],
 ['システム監査で求められる監査人の立場は？',['監査対象からの独立性','開発チームの責任者であること','取引先への従属','利用者と同じパスワードを使うこと'],0,'客観的な評価のため、監査対象から独立した立場が必要です。'],
 ['リスク対応の例として、保険を利用して損失を他者に負担してもらうものは？',['回避','移転','受容','増大'],1,'保険や契約でリスクを他者に移す対応はリスク移転です。'],
 ['プロジェクトの成果物を受け入れる条件は、いつ合意するのが適切？',['完成後に初めて決める','作業開始前など早期に決める','担当者が毎日変える','決める必要はない'],1,'受入条件を早期に共有すると、完成の判断や検証が明確になります。'],
 ['バックアップから復元できることを確認するには？',['保存先の名前だけ見る','定期的に復元テストする','ファイル数だけ数える','バックアップを常に削除する'],1,'保存されていても復元できるとは限らないため、復元テストが必要です。']
 ],
 technology:[
 ['CPUが主に担当する処理は？',['命令の実行と演算','用紙の印刷','電池の充電','ケーブルの接続'],0,'CPUは命令を実行し、演算や制御を行います。'],
 ['電源を切ると通常、記憶内容が失われるメモリは？',['ROM','RAM','SSD','HDD'],1,'RAMは揮発性メモリで、電源断で内容が失われます。'],
 ['ドメイン名とIPアドレスの対応を調べる仕組みは？',['DNS','USB','CPU','RAID'],0,'DNSはドメイン名をIPアドレスなどに対応付けます。'],
 ['Web通信を暗号化するHTTPSで用いられる仕組みは？',['TLS','CSV','JPEG','POS'],0,'HTTPSではTLSによって通信を保護します。'],
 ['データベースの行を一意に識別するためのキーは？',['主キー','候補画像','圧縮鍵','共有名'],0,'主キーは各行を一意に識別し、重複やNULLを許しません。'],
 ['SQLで表からデータを検索する文は？',['SELECT','PRINT','IMPORT','DRAW'],0,'SELECT文は表から必要なデータを取得するために使います。'],
 ['異なる種類の認証要素を組み合わせる方式は？',['多要素認証','単一ログイン','匿名接続','データ圧縮'],0,'知識・所持・生体など、異なる種類の要素を組み合わせます。'],
 ['本物を装うWebサイトなどに誘導して情報を盗む攻撃は？',['フィッシング','バックアップ','負荷分散','正規化'],0,'フィッシングは偽のサイトやメッセージを使って認証情報などを盗みます。'],
 ['データベースの正規化の主な目的は？',['重複と更新時の不整合を減らす','すべての値を削除する','暗号を解除する','画像を拡大する'],0,'正規化は適切に表を分割し、データの重複や不整合を減らします。'],
 ['1バイトは通常何ビット？',['2','4','8','16'],2,'1バイトは8ビットです。'],
 ['ネットワーク上で同じサービスを複数のサーバーに分散する仕組みは？',['負荷分散','データ消去','著作権保護','文字コード'],0,'負荷分散は処理を複数のサーバーに振り分けます。'],
 ['同じ入力から決まった長さの値を得て、整合性確認などに使うものは？',['ハッシュ関数','音声合成','ディスプレイ','表計算の列幅'],0,'ハッシュ関数は入力からハッシュ値を計算し、改変検知などに利用します。']
 ],
 grammar:[
 ['The report must be ___ by Friday.',['submit','submitted','submitting','submission'],1,'must be＋過去分詞で受動態。「金曜日までに提出されなければならない」。'],
 ['Ms. Lee ___ in this department since 2020.',['works','has worked','working','work'],1,'sinceと継続期間を表す文では現在完了形has workedを使います。'],
 ['Please contact us ___ you have any questions.',['if','although','during','despite'],0,'ifは「もし〜なら」。duringとdespiteの後ろには通常名詞が続きます。'],
 ['The new printer is ___ than the old one.',['fast','fastest','faster','fastly'],2,'thanがある比較の文なので比較級fasterを選びます。'],
 ['All employees are required ___ ID badges.',['wear','to wear','wearing','wore'],1,'be required to doで「〜することが求められる」です。'],
 ['The director spoke ___ about the new plan.',['clear','clearly','clearness','clearing'],1,'動詞spokeを修飾する副詞clearlyが必要です。'],
 ['We look forward to ___ you next week.',['meet','met','meeting','meets'],2,'look forward toのtoは前置詞なので後ろは動名詞meetingです。'],
 ['Neither the manager nor the assistants ___ available.',['is','are','was','being'],1,'neither A nor Bの動詞は近い主語に合わせるのが標準的。assistantsは複数です。'],
 ['The documents are on ___ desk.',['she','her','hers','herself'],1,'名詞deskの前には所有格herを使います。'],
 ['___ the heavy rain, the event continued.',['Although','Despite','Because','While'],1,'名詞句the heavy rainの前には前置詞Despite。「大雨にもかかわらず」。'],
 ['The meeting will start ___ 9 a.m.',['on','in','at','by'],2,'特定の時刻の前にはatを使います。'],
 ['This is the software ___ our team developed.',['who','that','where','when'],1,'物であるsoftwareを先行詞とし、目的語になる関係代名詞thatを使います。']
 ],
 vocabulary:[
 ['Please ___ your reservation by email.',['confirm','consume','compete','contain'],0,'confirmは「確認する」。予約を確認してください、という文です。'],
 ['The invoice is ___ on the last day of the month.',['due','wide','brief','aware'],0,'dueは「支払期限の」。請求書の支払期限が月末という意味です。'],
 ['We need to ___ the meeting until next Monday.',['postpone','produce','predict','protect'],0,'postponeは「延期する」。untilは延期先の時点を表します。'],
 ['The company offers a ___ salary.',['competitive','crowded','careless','commonplace'],0,'competitive salaryは「競争力のある給与」です。'],
 ['All visitors must sign in at the ___ desk.',['reception','revision','reaction','reduction'],0,'reception deskは受付です。'],
 ['The shipment was delayed due to a ___ of materials.',['shortage','surface','summary','schedule'],0,'shortage ofは「〜の不足」です。'],
 ['The warranty is ___ for two years.',['valid','vacant','visible','various'],0,'validは「有効な」。保証が2年間有効であるという意味です。'],
 ['The hotel is within walking ___ of the station.',['distance','demand','delivery','detail'],0,'within walking distanceは「歩いて行ける距離に」です。'],
 ['We appreciate your ___ with this matter.',['assistance','attendance','appearance','assignment'],0,'assistanceは「援助・協力」。この件への協力に感謝する、という文です。'],
 ['The technician will ___ the equipment tomorrow.',['inspect','invent','invite','include'],0,'inspectは「点検する・検査する」です。'],
 ['Please keep this information ___.',['confidential','convenient','consistent','considerable'],0,'confidentialは「秘密の・機密扱いの」です。'],
 ['The annual conference will ___ place in June.',['take','make','give','hold'],0,'take placeは「行われる・開催される」です。']
 ],
 reading:[
 ['When will the library reopen?',['Monday','Tuesday','Friday','Saturday'],1,'Tuesday morningと明記されています。','NOTICE: The library will be closed on Monday for maintenance. It will reopen on Tuesday morning.'],
 ['What should attendees bring?',['A printed ticket','A laptop','Lunch','A passport'],1,'持参物はa laptopです。研修開始時刻の情報と区別します。','EMAIL: The training session starts at 10 a.m. in Room 3. Please bring a laptop. Lunch will be provided.'],
 ['What is the deadline for submitting travel expenses?',['The 5th','The 10th','The 15th','The 20th'],2,'by the 15thが提出期限を示します。','MEMO: Submit travel expense reports by the 15th of each month. Reports received later will be processed the following month.'],
 ['Why was the shipment delayed?',['A road closure','A payment issue','A missing address','Bad packaging'],0,'because of a road closureが遅延の理由です。','MESSAGE: Your order has been shipped. Delivery will take an extra day because of a road closure near our warehouse.'],
 ['Which service is included in the room price?',['Dinner','Parking','Breakfast','Airport transfer'],2,'Breakfast is includedが根拠です。駐車場は追加料金です。','HOTEL INFO: Breakfast is included in the room price. Parking is available for an additional fee.'],
 ['Who should employees contact about the new software?',['Human Resources','The IT help desk','The sales director','The receptionist'],1,'不明点の問い合わせ先はthe IT help deskです。','ANNOUNCEMENT: The new software will be installed this weekend. For questions, contact the IT help desk.'],
 ['What is the main purpose of the email?',['To cancel an interview','To confirm an appointment','To advertise a sale','To request payment'],1,'日時と場所を確認するappointment confirmationです。','EMAIL: This is to confirm your appointment with Dr. Smith on Thursday at 2 p.m. Please arrive ten minutes early.'],
 ['When can customers receive a discount?',['Before noon','After 6 p.m.','On Sundays only','During opening week'],3,'during our opening weekとあります。','ADVERTISEMENT: Visit our new store during opening week and receive a 10% discount on all office supplies.'],
 ['How can employees reserve a meeting room?',['Call the hotel','Use the online calendar','Email every manager','Visit the warehouse'],1,'予約方法はthrough the online calendarです。','GUIDELINE: Meeting rooms must be reserved through the online calendar at least one day in advance.'],
 ['What is needed to return a product?',['The receipt','A membership card','A delivery vehicle','A business proposal'],0,'A receipt is requiredと明記されています。','POLICY: Unused products may be returned within 30 days. A receipt is required for all returns.'],
 ['Where has the workshop been moved?',['Room 1','Room 2','The main auditorium','The library'],2,'moved from Room 2 to the main auditorium。移動先を問う問題です。','UPDATE: Due to the large number of participants, the workshop has been moved from Room 2 to the main auditorium.'],
 ['What will happen on Friday?',['The office will move','The network will be unavailable','New staff will arrive','The cafeteria will open'],1,'金曜日の午後7時〜9時にnetwork unavailableとあります。','IT NOTICE: The network will be unavailable from 7 p.m. to 9 p.m. on Friday while we update the servers.']
 ]
};
export const studyQuestions=studyCategories.flatMap(([course,category])=>practiceSets[category].map(([prompt,options,answer,explanation,passage],i)=>({id:`${course}-${category}-${i+1}`,course,category,prompt,options,answer,explanation,passage:passage||''})));
// Spread correct answer positions while keeping the item IDs stable.
for(const question of studyQuestions){const shift=Number(question.id.split('-').at(-1))%4;question.options=question.options.slice(shift).concat(question.options.slice(0,shift));question.answer=(question.answer-shift+4)%4;}
export function studyStats(attempts){const totals={attempts:attempts.length,correct:attempts.filter(a=>a.correct).length,seconds:attempts.reduce((n,a)=>n+a.elapsed_seconds,0),completed:new Set(attempts.filter(a=>a.correct).map(a=>a.question_id)).size};const categories=studyCategories.map(([course,category])=>{const rows=attempts.filter(a=>a.course===course&&a.category===category);return {course,category,attempts:rows.length,correct:rows.filter(a=>a.correct).length,completed:new Set(rows.filter(a=>a.correct).map(a=>a.question_id)).size};});const days=Array.from(new Set(attempts.map(a=>new Date(a.created_at).toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})))).map(day=>({day,attempts:attempts.filter(a=>new Date(a.created_at).toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})===day).length}));return {totals,categories,days};}
