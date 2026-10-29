import Phaser from 'phaser';
import { Client, Room } from 'colyseus.js';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_POSITIONS } from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  private client!: Client;
  private room!: Room;

  // Массивы для хранения объектов каждого игрока
  private playerObjects: {
    body: Phaser.GameObjects.Circle;
    nameText: Phaser.GameObjects.Text;
    hpText: Phaser.GameObjects.Text;
    soulsText: Phaser.GameObjects.Text;
    readyText: Phaser.GameObjects.Text;
  }[] = [];

  private readyButton!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private logMessages: string[] = [];

  constructor() {
    super('GameScene');
  }

  create() {
    // Фон
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a1a);

    // Стол
    const table = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 400, 0x3d2817);
    table.setStrokeStyle(4, 0x5c3a21);

    // Создаём 4 позиции для игроков
    PLAYER_POSITIONS.forEach((pos, index) => {
      const colors = [0x8b0000, 0x006400, 0x00008b, 0x8b8b00];
      const body = this.add.circle(pos.x, pos.y, 40, colors[index]);
      body.setStrokeStyle(3, 0xffffff);

      const nameText = this.add.text(pos.x, pos.y + 60, '...', {
        fontSize: '18px', color: '#ffffff'
      }).setOrigin(0.5);

      const hpText = this.add.text(pos.x, pos.y - 60, 'HP: -', {
        fontSize: '16px', color: '#ff6666'
      }).setOrigin(0.5);

      const soulsText = this.add.text(pos.x, pos.y - 40, 'Souls: -', {
        fontSize: '16px', color: '#c9a961'
      }).setOrigin(0.5);

      const readyText = this.add.text(pos.x, pos.y + 80, '', {
        fontSize: '14px', color: '#66ff66'
      }).setOrigin(0.5);

      this.playerObjects.push({ body, nameText, hpText, soulsText, readyText });
    });

    // Кнопка "Готов"
    this.readyButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '[ Я ГОТОВ ]', {
      fontSize: '24px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.readyButton.on('pointerover', () => this.readyButton.setStyle({ color: '#c9a961' }));
    this.readyButton.on('pointerout', () => this.readyButton.setStyle({ color: '#ffffff' }));
    this.readyButton.on('pointerdown', () => this.toggleReady());

    // Журнал событий
    this.logText = this.add.text(20, 20, '', {
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace'
    });

    // Подключаемся к серверу
    this.connectToServer();
  }

    private async connectToServer() {
    try {
      this.client = new Client('ws://100.107.206.61:2567'); 
      
      this.room = await this.client.joinOrCreate('game', { name: 'Женя' });

      this.addLog(`✓ Подключился! Мой ID: ${this.room.sessionId}`);

      // Слушаем изменения состояния
      this.room.onStateChange(() => {
        this.renderPlayers();
      });

      // Слушаем события (журнал)
      this.room.onMessage('event', (msg: any) => {
        this.addLog(msg.text);
      });

      // Когда отключился
      this.room.onLeave(() => {
        this.addLog('✗ Соединение закрыто.');
      });

    } catch (e: any) {
      console.error('Ошибка подключения:', e);
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Ошибка подключения к серверу!\nПроверь, запущен ли сервер у Ромы.', {
        fontSize: '20px', color: '#ff0000', align: 'center'
      }).setOrigin(0.5);
    }
  }

  private renderPlayers() {
    if (!this.room) return;

    const players = Array.from(this.room.state.players.entries());
    
    players.forEach(([sessionId, player], index) => {
      if (index >= this.playerObjects.length) return;
      const obj = this.playerObjects[index];

      // Обновляем данные из сервера
      obj.nameText.setText(player.name || `Игрок ${index + 1}`);
      obj.hpText.setText(`HP: ${player.hp}/${player.maxHp}`);
      obj.soulsText.setText(`Souls: ${player.souls}`);
      obj.readyText.setText(player.ready ? '✓ ГОТОВ' : '');

      // Подсветка себя жёлтым
      if (sessionId === this.room.sessionId) {
        obj.body.setStrokeStyle(4, 0xffff00);
      }
    });

    // Обновляем текст кнопки
    const me = this.room.state.players.get(this.room.sessionId);
    if (me) {
      this.readyButton.setText(me.ready ? '[ НЕ ГОТОВ ]' : '[ Я ГОТОВ ]');
    }
  }

  private toggleReady() {
    if (!this.room) return;
    const me = this.room.state.players.get(this.room.sessionId);
    if (me) {
      // Отправляем сообщение 'ready' на сервер
      this.room.send('ready', { value: !me.ready });
    }
  }

  private addLog(text: string) {
    this.logMessages.unshift(text);
    if (this.logMessages.length > 10) this.logMessages.pop();
    this.logText.setText(this.logMessages.join('\n'));
  }
}