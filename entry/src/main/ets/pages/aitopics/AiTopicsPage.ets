import { AiContentService } from '../../common/AiContentService';
import { AiTopicRecommendation } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct AiTopicsPage {
  @State topics: AiTopicRecommendation[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentCategory: number = 0;
  @State expandedTopicId: string = '';
  @StorageProp('userId') userId: string = '';
  private contentService: AiContentService = AiContentService.getInstance();
  private categories: string[] = ['全部', '新能源', '智能驾驶', '品牌对比', '娱乐', '其他'];
  private categoryKeys: string[] = ['', 'new_energy', 'smart_drive', 'brand_compare', 'entertainment', 'other'];

  aboutToAppear() {
    this.loadTopics();
  }

  private async loadTopics() {
    this.loading = true;
    const catKey: string = this.currentCategory === 0 ? '' : this.categoryKeys[this.currentCategory];
    const resp = await this.contentService.getHotTopics(catKey);
    if (resp.success && resp.data !== null) {
      this.topics = resp.data;
    }
    this.loading = false;
    this.refreshing = false;
  }

  private onCategoryChange(index: number): void {
    this.currentCategory = index;
    this.loadTopics();
  }

  private toggleExpand(topicId: string): void {
    if (this.expandedTopicId === topicId) {
      this.expandedTopicId = '';
    } else {
      this.expandedTopicId = topicId;
    }
  }

  private getHotScoreColor(score: number): string {
    if (score >= 95) return '#DC2626';
    if (score >= 85) return '#F59E0B';
    if (score >= 70) return '#3B82F6';
    return $r('app.color.text_secondary').toString();
  }

  private getCategoryLabel(cat: string): string {
    if (cat === 'new_energy') return '新能源';
    if (cat === 'smart_drive') return '智能驾驶';
    if (cat === 'brand_compare') return '品牌对比';
    if (cat === 'entertainment') return '娱乐';
    return '其他';
  }

  private getCategoryColor(cat: string): string {
    if (cat === 'new_energy') return '#10B981';
    if (cat === 'smart_drive') return '#6366F1';
    if (cat === 'brand_compare') return '#F59E0B';
    if (cat === 'entertainment') return '#EC4899';
    return '#6B7280';
  }

  build() {
    Column() {
      Row() {
        Text('AI热门选题')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
        Text('推荐')
          .fontSize(12)
          .fontColor(Color.White)
          .backgroundColor($r('app.color.purple_color'))
          .borderRadius(8)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      Scroll() {
        Row() {
          ForEach(this.categories, (cat: string, index: number) => {
            Text(cat)
              .fontSize(13)
              .fontColor(this.currentCategory === index ? Color.White : $r('app.color.text_secondary'))
              .backgroundColor(this.currentCategory === index ? $r('app.color.primary_color') : $r('app.color.bg_tag_color'))
              .borderRadius(14)
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
              .margin({ right: 8 })
              .onClick(() => {
                this.onCategoryChange(index);
              })
          }, (cat: string, index: number) => index.toString())
        }
      }
      .scrollable(ScrollDirection.Horizontal)
      .width('100%')
      .padding({ left: 16, right: 16 })
      .scrollBar(BarState.Off)

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color($r('app.color.primary_color'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.topics, (topic: AiTopicRecommendation, index: number) => {
              ListItem() {
                this.TopicCard(topic)
              }
            }, (topic: AiTopicRecommendation, index: number) => topic.id + '_' + index.toString())
          }
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 8 })
        }
        .onRefreshing(() => {
          this.loadTopics();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  TopicCard(topic: AiTopicRecommendation) {
    Column() {
      Row() {
        Text(this.getCategoryLabel(topic.category))
          .fontSize(11)
          .fontColor(Color.White)
          .backgroundColor(this.getCategoryColor(topic.category))
          .borderRadius(8)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
        if (topic.isOriginal) {
          Text('抢首发')
            .fontSize(11)
            .fontColor(Color.White)
            .backgroundColor($r('app.color.danger_color'))
            .borderRadius(8)
            .padding({ left: 6, right: 6, top: 2, bottom: 2 })
            .margin({ left: 6 })
        }
        Blank()
        Row() {
          Text('热度')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
          Text(topic.hotScore.toString())
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.getHotScoreColor(topic.hotScore))
            .margin({ left: 4 })
        }
      }
      .width('100%')

      Text(topic.title)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('app.color.text_primary'))
        .margin({ top: 8 })
        .width('100%')

      Text(topic.summary)
        .fontSize(13)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 4 })
        .width('100%')
        .lineHeight(20)
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })

      if (this.expandedTopicId === topic.id) {
        Column() {
          Text('推荐角度')
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_primary'))
            .width('100%')
            .margin({ top: 8 })
          
          if (topic.suggestedAngles.length > 0) {
            Flex({ wrap: FlexWrap.Wrap }) {
              ForEach(topic.suggestedAngles, (angle: string, aIndex: number) => {
                Text(angle)
                  .fontSize(12)
                  .fontColor($r('app.color.primary_color'))
                  .backgroundColor($r('app.color.bg_tag_color'))
                  .borderRadius(10)
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .margin({ right: 6, top: 6 })
              }, (angle: string, aIndex: number) => angle + '_' + aIndex.toString())
            }
            .width('100%')
          }

          if (topic.carModels.length > 0) {
            Text('关联车型')
              .fontSize(13)
              .fontWeight(FontWeight.Medium)
              .fontColor($r('app.color.text_primary'))
              .width('100%')
              .margin({ top: 8 })

            Flex({ wrap: FlexWrap.Wrap }) {
              ForEach(topic.carModels, (model: string, mIndex: number) => {
                Text(model)
                  .fontSize(12)
                  .fontColor($r('app.color.warning_color'))
                  .backgroundColor($r('app.color.bg_tag_color'))
                  .borderRadius(10)
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .margin({ right: 6, top: 6 })
              }, (model: string, mIndex: number) => model + '_' + mIndex.toString())
            }
            .width('100%')
          }
        }
        .width('100%')
      }

      Row() {
        Text(this.expandedTopicId === topic.id ? '收起' : '查看详情')
          .fontSize(12)
          .fontColor($r('app.color.primary_color'))
      }
      .width('100%')
      .margin({ top: 8 })
      .onClick(() => {
        this.toggleExpand(topic.id);
      })
    }
    .width('100%')
    .padding(14)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }
}
